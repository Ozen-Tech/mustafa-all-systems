import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from './alertHelper';
import { ensurePersistablePhotoUri } from './photoUri';
import {
  checkGalleryAssetTakenToday,
  photoDateRejectMessage,
} from './photoDateValidation';

/** Na web, qualidade alta gera base64 enorme e estoura rede/limite do Cloud Run. */
const DEFAULT_QUALITY = Platform.OS === 'web' ? 0.5 : 0.8;
const MAX_WEB_QUALITY = 0.55;

function resolveQuality(requested?: number): number {
  const q = requested ?? DEFAULT_QUALITY;
  if (Platform.OS === 'web') {
    return Math.min(q, MAX_WEB_QUALITY);
  }
  return q;
}

/**
 * No PWA, blob: URLs expiram/revogam e o upload falha com "Failed to fetch".
 * Converte imediatamente para data URL comprimida — NUNCA devolve blob: no web.
 */
async function normalizePickedUri(uri: string): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  try {
    const stable = await ensurePersistablePhotoUri(uri, { compress: true });
    if (stable.startsWith('blob:')) {
      throw new Error('URI ainda é blob após normalização');
    }
    return stable;
  } catch (error) {
    console.error('[imagePicker] Falha ao normalizar URI web:', error);
    throw new Error('Não foi possível ler a foto. Tente novamente.');
  }
}

async function launchCamera(quality: number): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== 'granted') {
    showAlert(
      'Permissão necessária',
      'É necessário permitir o acesso à câmera para tirar fotos da visita.'
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality,
    allowsEditing: false,
  });

  if (!result.canceled && result.assets[0]?.uri) {
    // Foto tirada agora — sempre do dia.
    return normalizePickedUri(result.assets[0].uri);
  }
  return null;
}

/**
 * Valida data do dia **antes** de comprimir (compressão remove EXIF no web).
 */
async function acceptGalleryAsset(
  asset: ImagePicker.ImagePickerAsset
): Promise<{ uri: string } | { rejected: 'missing_date' | 'not_today' }> {
  const check = await checkGalleryAssetTakenToday({
    uri: asset.uri,
    exif: (asset.exif ?? null) as Record<string, unknown> | null,
  });
  if (!check.ok) {
    return { rejected: check.reason };
  }
  if (!asset.uri) {
    return { rejected: 'missing_date' };
  }
  return { uri: await normalizePickedUri(asset.uri) };
}

async function launchGallerySingle(quality: number): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    showAlert('Permissão necessária', 'É necessário permitir acesso à galeria ou câmera.');
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality,
    allowsEditing: false,
    exif: true,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  const outcome = await acceptGalleryAsset(result.assets[0]);
  if ('rejected' in outcome) {
    const { title, message } = photoDateRejectMessage(outcome.rejected);
    showAlert(title, message);
    return null;
  }
  return outcome.uri;
}

/**
 * Preferencialmente câmera; se cancelar/indisponível, tenta galeria com validação do dia.
 */
export async function pickSinglePhoto(options?: { quality?: number }): Promise<string | null> {
  const quality = resolveQuality(options?.quality);

  try {
    const fromCamera = await launchCamera(quality);
    if (fromCamera) return fromCamera;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Não foi possível ler')) {
      throw error;
    }
  }

  return launchGallerySingle(quality);
}

/** Seleção da galeria (fluxo de indústrias). Só aceita fotos tiradas hoje. */
export async function pickMultiplePhotos(options?: {
  quality?: number;
  selectionLimit?: number;
}): Promise<string[]> {
  const quality = resolveQuality(options?.quality);
  const selectionLimit = options?.selectionLimit ?? 20;

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') {
    showAlert('Permissão necessária', 'É necessário permitir acesso à galeria.');
    return [];
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality,
    selectionLimit,
    exif: true,
  });

  if (result.canceled) return [];

  const accepted: string[] = [];
  let rejectedMissing = 0;
  let rejectedNotToday = 0;

  for (const asset of result.assets) {
    if (!asset.uri) continue;
    const outcome = await acceptGalleryAsset(asset);
    if ('rejected' in outcome) {
      if (outcome.rejected === 'not_today') rejectedNotToday += 1;
      else rejectedMissing += 1;
      continue;
    }
    accepted.push(outcome.uri);
  }

  const rejected = rejectedMissing + rejectedNotToday;
  if (rejected > 0) {
    const parts: string[] = [];
    if (rejectedNotToday > 0) {
      parts.push(`${rejectedNotToday} fora do dia de hoje`);
    }
    if (rejectedMissing > 0) {
      parts.push(`${rejectedMissing} sem data verificável`);
    }
    showAlert(
      'Algumas fotos foram rejeitadas',
      `${rejected} foto(s) não aceitas (${parts.join('; ')}). Só entram fotos tiradas hoje.`
    );
  }

  return accepted;
}
