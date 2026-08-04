import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import apiConfig from '../config/api';
import { apiClient, refreshAccessToken } from './apiClient';
import { getAccessToken } from './tokenStorage';
import {
  isFragilePhotoUri,
  isLocalPhotoUri,
  preparePhotoForWebUpload,
} from '../utils/photoUri';

export interface PresignedUrlRequest {
  visitId: string;
  type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
  contentType?: string;
  extension?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') return true;
  if (!error.response && error.message) {
    const msg = String(error.message).toLowerCase();
    return (
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('timeout') ||
      msg.includes('aborted')
    );
  }
  return false;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

/**
 * Upload PWA via multipart (binário). Evita JSON com base64 que dobra a memória e mata o Chrome.
 */
async function postDirectBinary(
  dataUrl: string,
  meta: PresignedUrlRequest,
  attempts = 3
): Promise<{ url: string; key?: string }> {
  const contentType = meta.contentType || 'image/jpeg';
  let lastError: any;

  for (let i = 0; i < attempts; i++) {
    try {
      const blob = await dataUrlToBlob(dataUrl);
      const form = new FormData();
      form.append('file', blob, `photo.${meta.extension || 'jpg'}`);
      form.append('visitId', meta.visitId);
      form.append('type', meta.type);
      form.append('contentType', contentType);
      form.append('extension', meta.extension || 'jpg');

      const token = await getAccessToken();
      const response = await fetch(`${apiConfig.BASE_URL}/upload/photo/direct-binary`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: form,
      });

      if (response.status === 401 && i < attempts - 1) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          continue;
        }
      }

      if (!response.ok) {
        let detail = `HTTP ${response.status}`;
        try {
          const body = await response.json();
          detail = body?.detail || body?.message || detail;
        } catch {
          /* ignore */
        }
        const err: any = new Error(detail);
        err.response = { status: response.status };
        throw err;
      }

      const data = await response.json();
      return { url: data.url, key: data.key };
    } catch (error: any) {
      lastError = error;
      if (error?.response?.status && error.response.status < 500 && error.response.status !== 401) {
        throw error;
      }
      if (!isNetworkError(error) && error?.response) {
        throw error;
      }
      if (i < attempts - 1) {
        await sleep(600 * (i + 1));
        continue;
      }
    }
  }
  throw lastError;
}

/** Fallback legado JSON base64 (se binary endpoint ainda não estiver no Cloud Run). */
async function postDirectBase64(
  imageBase64: string,
  meta: PresignedUrlRequest,
  attempts = 2
): Promise<{ url: string; key?: string }> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await apiClient.post(
        '/upload/photo/direct',
        {
          visitId: meta.visitId,
          type: meta.type,
          contentType: meta.contentType || 'image/jpeg',
          extension: meta.extension || 'jpg',
          imageBase64,
        },
        { timeout: 120_000 }
      );
      return { url: response.data.url, key: response.data.key };
    } catch (error: any) {
      lastError = error;
      if (error?.response?.status && error.response.status < 500) {
        throw error;
      }
      if (i < attempts - 1) {
        await sleep(600 * (i + 1));
        continue;
      }
    }
  }
  throw lastError;
}

function shouldUseBackendUpload(fileUri: string): boolean {
  return (
    Platform.OS === 'web' ||
    fileUri.startsWith('blob:') ||
    fileUri.startsWith('data:')
  );
}

export const photoService = {
  async getPresignedUrl(data: PresignedUrlRequest) {
    const response = await apiClient.post('/upload/photo', data);
    return response.data;
  },

  /**
   * Upload unificado: PWA envia multipart binário (ou JSON legado); nativo usa presigned URL.
   */
  async uploadPhoto(data: PresignedUrlRequest & { fileUri: string }): Promise<{ url: string; key?: string }> {
    const contentType = data.contentType || 'image/jpeg';
    const meta: PresignedUrlRequest = {
      visitId: data.visitId,
      type: data.type,
      contentType,
      extension: data.extension || 'jpg',
    };

    if (shouldUseBackendUpload(data.fileUri)) {
      if (isFragilePhotoUri(data.fileUri)) {
        throw new Error(
          'Foto local expirou ou ficou inválida. Tire/selecione a foto novamente e envie em seguida.'
        );
      }

      const prepared = await preparePhotoForWebUpload(data.fileUri);

      try {
        return await postDirectBinary(prepared, meta);
      } catch (error: any) {
        // Endpoint novo ainda não no Cloud Run → fallback base64
        if (error?.response?.status === 404 || error?.message?.includes('404')) {
          console.warn('[photoService] direct-binary indisponível, usando JSON base64');
          return postDirectBase64(prepared, meta);
        }
        throw error;
      }
    }

    const { presignedUrl, url, key } = await this.getPresignedUrl(data);
    const ok = await this.uploadToFirebase(presignedUrl, data.fileUri, contentType);
    if (!ok) throw new Error('Falha no upload da foto');
    return { url, key };
  },

  async uploadToFirebase(
    presignedUrl: string,
    fileUri: string,
    contentType: string = 'image/jpeg'
  ): Promise<boolean> {
    try {
      if (!isLocalPhotoUri(fileUri)) {
        throw new Error('URI local inválida para upload: ' + fileUri);
      }

      if (shouldUseBackendUpload(fileUri)) {
        throw new Error('Use photoService.uploadPhoto() na web');
      }

      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('Arquivo não encontrado: ' + fileUri);
      }

      const normalizedUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;
      const uploadResult = await FileSystem.uploadAsync(presignedUrl, normalizedUri, {
        httpMethod: 'PUT',
        uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
        headers: {
          'Content-Type': contentType,
        },
      });

      return uploadResult.status === 200 || uploadResult.status === 201;
    } catch (error: any) {
      console.error('❌ [photoService] Erro no upload:', error);
      throw error;
    }
  },
};
