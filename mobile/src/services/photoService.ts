import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiConfig from '../config/api';
import { isLocalPhotoUri } from '../utils/photoUri';

const apiClient = axios.create({
  baseURL: apiConfig.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export interface PresignedUrlRequest {
  visitId: string;
  type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
  contentType?: string;
  extension?: string;
}

export const photoService = {
  async getPresignedUrl(data: PresignedUrlRequest) {
    const response = await apiClient.post(apiConfig.ENDPOINTS.UPLOAD.PHOTO, data);
    return response.data;
  },

  /**
   * Faz upload de uma foto para Firebase Storage usando presigned URL.
   * Nativo: expo-file-system. Web/PWA: fetch + PUT com blob.
   */
  async uploadToFirebase(presignedUrl: string, fileUri: string, contentType: string = 'image/jpeg'): Promise<boolean> {
    try {
      if (!isLocalPhotoUri(fileUri)) {
        throw new Error('URI local inválida para upload: ' + fileUri);
      }

      if (Platform.OS === 'web' || fileUri.startsWith('blob:') || fileUri.startsWith('data:')) {
        const response = await fetch(fileUri);
        const blob = await response.blob();
        const uploadResponse = await fetch(presignedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: blob,
        });
        if (uploadResponse.status === 200 || uploadResponse.status === 201) {
          return true;
        }
        console.error('❌ [photoService] Upload web falhou:', uploadResponse.status);
        return false;
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

      if (uploadResult.status === 200 || uploadResult.status === 201) {
        return true;
      }

      console.error('❌ [photoService] Upload falhou com status:', uploadResult.status);
      return false;
    } catch (error: any) {
      console.error('❌ [photoService] Erro no upload:', error);
      console.error('❌ [photoService] Tipo do erro:', error?.constructor?.name);
      console.error('❌ [photoService] Mensagem:', error?.message);
      console.error('❌ [photoService] Stack:', error?.stack);
      
      // Erros comuns e suas soluções
      if (error?.message?.includes('Network request failed')) {
        console.error('❌ [photoService] Erro de rede - Verifique conexão com internet');
      } else if (error?.message?.includes('403')) {
        console.error('❌ [photoService] Erro 403 - Verifique as regras do Firebase Storage!');
      }
      
      throw error;
    }
  },
};

