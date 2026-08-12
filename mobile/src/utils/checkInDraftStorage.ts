import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  estimateDataUrlBytes,
  isFragilePhotoUri,
  isStableLocalPhotoUri,
  preparePhotoForWebUpload,
} from './photoUri';

const DRAFT_PREFIX = 'checkin_draft_v1_';
const WEB_DRAFT_MAX_BYTES = 180_000;
const DRAFT_MAX_AGE_MS = 4 * 60 * 60 * 1000;

export interface CheckInDraft {
  storeId: string;
  photoUri: string;
  savedAt: number;
}

export async function saveCheckInDraft(
  promoterId: string,
  storeId: string,
  photoUri: string
): Promise<void> {
  try {
    if (!photoUri || isFragilePhotoUri(photoUri)) return;

    let stableUri = photoUri;
    if (Platform.OS === 'web') {
      // Já deve vir comprimida do picker; só garante teto baixo para AsyncStorage.
      if (!isStableLocalPhotoUri(photoUri) || isFragilePhotoUri(photoUri)) {
        stableUri = await preparePhotoForWebUpload(photoUri, 'checkin');
      } else if (estimateDataUrlBytes(photoUri) > WEB_DRAFT_MAX_BYTES) {
        stableUri = await preparePhotoForWebUpload(photoUri, 'checkin');
      }
      if (estimateDataUrlBytes(stableUri) > WEB_DRAFT_MAX_BYTES) {
        console.warn('[checkInDraft] Foto ainda grande; não cacheia para evitar OOM.');
        return;
      }
    }

    const draft: CheckInDraft = {
      storeId,
      photoUri: stableUri,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(`${DRAFT_PREFIX}${promoterId}`, JSON.stringify(draft));
  } catch (error) {
    console.warn('[checkInDraft] Falha ao salvar rascunho:', error);
  }
}

export async function loadCheckInDraft(
  promoterId: string,
  storeId: string
): Promise<CheckInDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(`${DRAFT_PREFIX}${promoterId}`);
    if (!raw) return null;

    const draft = JSON.parse(raw) as CheckInDraft;
    if (draft.storeId !== storeId) return null;
    if (Date.now() - draft.savedAt > DRAFT_MAX_AGE_MS) {
      await clearCheckInDraft(promoterId);
      return null;
    }
    if (isFragilePhotoUri(draft.photoUri)) {
      await clearCheckInDraft(promoterId);
      return null;
    }
    return draft;
  } catch (error) {
    console.warn('[checkInDraft] Falha ao restaurar rascunho:', error);
    return null;
  }
}

export async function clearCheckInDraft(promoterId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(`${DRAFT_PREFIX}${promoterId}`);
  } catch {
    /* ignore */
  }
}
