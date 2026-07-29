import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  estimateDataUrlBytes,
  isFragilePhotoUri,
  isStableLocalPhotoUri,
  preparePhotoForWebUpload,
  toPersistablePhotoUri,
} from './photoUri';

export interface PendingPhoto {
  id?: string;
  uri: string;
  type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
  visitId: string;
  industryId?: string;
  timestamp: number;
}

const PENDING_PHOTOS_PREFIX = 'pending_photos_';
/** localStorage no Chrome Android quebra/reinicia com payloads grandes. */
const WEB_PENDING_MAX_TOTAL_BYTES = 1_800_000;

/**
 * Salva fotos pendentes (não enviadas) para uma visita.
 * No web, comprime e limita o tamanho total para não derrubar a aba.
 */
export async function savePendingPhotos(visitId: string, photos: PendingPhoto[]): Promise<void> {
  try {
    const key = `${PENDING_PHOTOS_PREFIX}${visitId}`;

    if (photos.length === 0) {
      await AsyncStorage.removeItem(key);
      console.log(`[sessionStorage] Fotos pendentes limpas para visita ${visitId}`);
      return;
    }

    let toStore = photos;
    if (Platform.OS === 'web') {
      const stable: PendingPhoto[] = [];
      let totalBytes = 0;
      for (const photo of photos) {
        if (isFragilePhotoUri(photo.uri)) continue;
        try {
          let uri = isStableLocalPhotoUri(photo.uri)
            ? photo.uri
            : await toPersistablePhotoUri(photo.uri);
          if (isFragilePhotoUri(uri)) continue;
          if (uri.startsWith('data:image/')) {
            uri = await preparePhotoForWebUpload(uri);
          }
          const size = estimateDataUrlBytes(uri);
          if (totalBytes + size > WEB_PENDING_MAX_TOTAL_BYTES) {
            console.warn(
              '[sessionStorage] Limite de cache local atingido; demais fotos ficam só na memória até enviar.'
            );
            break;
          }
          totalBytes += size;
          stable.push({ ...photo, uri });
        } catch (error) {
          console.warn('[sessionStorage] Pulando foto não persistível:', error);
        }
      }
      toStore = stable;
      if (toStore.length === 0) {
        await AsyncStorage.removeItem(key);
        return;
      }
    }

    await AsyncStorage.setItem(key, JSON.stringify(toStore));
    console.log(`[sessionStorage] Salvas ${toStore.length} fotos pendentes para visita ${visitId}`);
  } catch (error: any) {
    // QuotaExceeded no Chrome: não derruba a visita — só deixa de cachear.
    console.error('[sessionStorage] Erro ao salvar fotos pendentes:', error);
    if (
      String(error?.name || '').includes('Quota') ||
      String(error?.message || '').toLowerCase().includes('quota')
    ) {
      try {
        await AsyncStorage.removeItem(`${PENDING_PHOTOS_PREFIX}${visitId}`);
      } catch {
        /* ignore */
      }
      return;
    }
  }
}

/**
 * Restaura fotos pendentes de uma visita
 */
export async function getPendingPhotos(visitId: string): Promise<PendingPhoto[]> {
  try {
    const key = `${PENDING_PHOTOS_PREFIX}${visitId}`;
    const data = await AsyncStorage.getItem(key);
    if (!data) {
      return [];
    }
    const photos = JSON.parse(data) as PendingPhoto[];
    console.log(`[sessionStorage] Restauradas ${photos.length} fotos pendentes para visita ${visitId}`);
    return photos;
  } catch (error) {
    console.error('[sessionStorage] Erro ao restaurar fotos pendentes:', error);
    return [];
  }
}

/**
 * Limpa fotos pendentes de uma visita (após upload bem-sucedido)
 */
export async function clearPendingPhotos(visitId: string): Promise<void> {
  try {
    const key = `${PENDING_PHOTOS_PREFIX}${visitId}`;
    await AsyncStorage.removeItem(key);
    console.log(`[sessionStorage] Fotos pendentes limpas para visita ${visitId}`);
  } catch (error) {
    console.error('[sessionStorage] Erro ao limpar fotos pendentes:', error);
  }
}

/**
 * Obtém todas as visitas com fotos pendentes
 */
export async function getAllPendingVisits(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pendingKeys = keys.filter((key) => key.startsWith(PENDING_PHOTOS_PREFIX));
    return pendingKeys.map((key) => key.replace(PENDING_PHOTOS_PREFIX, ''));
  } catch (error) {
    console.error('[sessionStorage] Erro ao obter visitas pendentes:', error);
    return [];
  }
}

/**
 * Limpa todas as fotos pendentes (útil para limpeza geral)
 */
export async function clearAllPendingPhotos(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const pendingKeys = keys.filter((key) => key.startsWith(PENDING_PHOTOS_PREFIX));
    await AsyncStorage.multiRemove(pendingKeys);
    console.log(`[sessionStorage] Limpas ${pendingKeys.length} chaves de fotos pendentes`);
  } catch (error) {
    console.error('[sessionStorage] Erro ao limpar todas as fotos pendentes:', error);
  }
}
