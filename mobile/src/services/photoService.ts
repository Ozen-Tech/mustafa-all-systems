import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './apiClient';
import {
  compressDataUrl,
  isFragilePhotoUri,
  isLocalPhotoUri,
  toPersistablePhotoUri,
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

async function uriToBase64(fileUri: string): Promise<string> {
  if (isFragilePhotoUri(fileUri)) {
    throw new Error(
      'Foto local expirou ou ficou inválida. Tire/selecione a foto novamente e envie em seguida.'
    );
  }

  let dataUrl: string;
  if (fileUri.startsWith('data:image/')) {
    dataUrl = fileUri;
  } else {
    try {
      dataUrl = await toPersistablePhotoUri(fileUri);
    } catch (error: any) {
      const msg = String(error?.message || error || '');
      if (msg.toLowerCase().includes('failed to fetch') || isFragilePhotoUri(fileUri)) {
        throw new Error(
          'Foto local expirou ou ficou inválida. Tire/selecione a foto novamente e envie em seguida.'
        );
      }
      throw error;
    }
  }

  if (Platform.OS === 'web' && dataUrl.startsWith('data:image/')) {
    return compressDataUrl(dataUrl);
  }
  return dataUrl;
}

function shouldUseBackendUpload(fileUri: string): boolean {
  return (
    Platform.OS === 'web' ||
    fileUri.startsWith('blob:') ||
    fileUri.startsWith('data:')
  );
}

async function postDirectWithRetry(
  body: Record<string, unknown>,
  attempts = 3
): Promise<{ url: string; key?: string }> {
  let lastError: any;
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await apiClient.post('/upload/photo/direct', body, {
        timeout: 120_000,
      });
      return { url: response.data.url, key: response.data.key };
    } catch (error: any) {
      lastError = error;
      // Blob morto / validação: não retry
      if (error?.response?.status && error.response.status < 500) {
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

export const photoService = {
  async getPresignedUrl(data: PresignedUrlRequest) {
    const response = await apiClient.post('/upload/photo', data);
    return response.data;
  },

  /**
   * Upload unificado: PWA envia via backend (evita CORS do GCS); nativo usa presigned URL.
   */
  async uploadPhoto(data: PresignedUrlRequest & { fileUri: string }): Promise<{ url: string; key?: string }> {
    const contentType = data.contentType || 'image/jpeg';

    if (shouldUseBackendUpload(data.fileUri)) {
      const imageBase64 = await uriToBase64(data.fileUri);
      return postDirectWithRetry({
        visitId: data.visitId,
        type: data.type,
        contentType,
        extension: data.extension || 'jpg',
        imageBase64,
      });
    }

    const { presignedUrl, url, key } = await this.getPresignedUrl(data);
    const ok = await this.uploadToFirebase(presignedUrl, data.fileUri, contentType);
    if (!ok) throw new Error('Falha no upload da foto');
    return { url, key };
  },

  /**
   * Upload nativo direto para Firebase (presigned URL + file system).
   * Na web, prefira uploadPhoto().
   */
  async uploadToFirebase(presignedUrl: string, fileUri: string, contentType: string = 'image/jpeg'): Promise<boolean> {
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
