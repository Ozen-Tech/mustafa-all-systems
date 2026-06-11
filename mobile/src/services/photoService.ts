import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './apiClient';
import { isLocalPhotoUri } from '../utils/photoUri';

export interface PresignedUrlRequest {
  visitId: string;
  type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
  contentType?: string;
  extension?: string;
}

async function uriToBase64(fileUri: string): Promise<string> {
  if (fileUri.startsWith('data:image/')) return fileUri;
  const response = await fetch(fileUri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
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
   * Upload unificado: PWA envia via backend (evita CORS do GCS); nativo usa presigned URL.
   */
  async uploadPhoto(data: PresignedUrlRequest & { fileUri: string }): Promise<{ url: string; key?: string }> {
    const contentType = data.contentType || 'image/jpeg';

    if (shouldUseBackendUpload(data.fileUri)) {
      const imageBase64 = await uriToBase64(data.fileUri);
      const response = await apiClient.post('/upload/photo/direct', {
        visitId: data.visitId,
        type: data.type,
        contentType,
        extension: data.extension || 'jpg',
        imageBase64,
      });
      return { url: response.data.url, key: response.data.key };
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
