import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from './alertHelper';
import {
  ensurePersistablePhotoUri,
  isLowMemoryWebDevice,
  PhotoCompressProfile,
} from './photoUri';
import {
  checkGalleryAssetTakenToday,
  photoDateRejectMessage,
} from './photoDateValidation';

/** Na web, qualidade alta gera base64 enorme e estoura memória/rede no Android. */
const DEFAULT_QUALITY = Platform.OS === 'web' ? 0.28 : 0.8;
const MAX_WEB_QUALITY = 0.32;
const CHECKIN_WEB_QUALITY = 0.18;

function resolveQuality(requested?: number, profile?: PhotoCompressProfile): number {
  if (Platform.OS === 'web') {
    if (profile === 'checkin' || profile === 'lowMemory' || isLowMemoryWebDevice()) {
      return Math.min(requested ?? CHECKIN_WEB_QUALITY, CHECKIN_WEB_QUALITY);
    }
    return Math.min(requested ?? DEFAULT_QUALITY, MAX_WEB_QUALITY);
  }
  return requested ?? 0.8;
}

/**
 * No PWA, blob: URLs expiram/revogam e o upload falha com "Failed to fetch".
 * Comprime imediatamente via canvas (sem data URL full-res) — NUNCA devolve blob: no web.
 */
async function normalizePickedUri(
  uri: string,
  profile?: PhotoCompressProfile
): Promise<string> {
  if (Platform.OS !== 'web') return uri;
  try {
    const resolvedProfile =
      profile ?? (isLowMemoryWebDevice() ? 'lowMemory' : 'default');
    const stable = await ensurePersistablePhotoUri(uri, {
      compress: true,
      profile: resolvedProfile,
    });
    if (stable.startsWith('blob:')) {
      throw new Error('URI ainda é blob após normalização');
    }
    return stable;
  } catch (error) {
    console.error('[imagePicker] Falha ao normalizar URI web:', error);
    throw new Error(
      'Não foi possível processar a foto (memória do celular). Feche outros apps e tente de novo, ou escolha uma foto da galeria.'
    );
  }
}

async function launchCamera(
  quality: number,
  profile?: PhotoCompressProfile
): Promise<string | null> {
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
    exif: false,
  });

  if (!result.canceled && result.assets[0]?.uri) {
    return normalizePickedUri(result.assets[0].uri, profile);
  }
  return null;
}

async function acceptGalleryAsset(
  asset: ImagePicker.ImagePickerAsset,
  profile?: PhotoCompressProfile
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
  return { uri: await normalizePickedUri(asset.uri, profile) };
}

async function launchGallerySingle(
  quality: number,
  profile?: PhotoCompressProfile
): Promise<string | null> {
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

  const outcome = await acceptGalleryAsset(result.assets[0], profile);
  if ('rejected' in outcome) {
    const { title, message } = photoDateRejectMessage(outcome.rejected);
    showAlert(title, message);
    return null;
  }
  return outcome.uri;
}

/**
 * Preferencialmente câmera; se cancelar/indisponível, tenta galeria com validação do dia.
 * profile: 'checkin' usa compressão ultra-agressiva (Galaxy A16 / low RAM).
 */
export async function pickSinglePhoto(options?: {
  quality?: number;
  profile?: PhotoCompressProfile;
}): Promise<string | null> {
  const profile = options?.profile;
  const quality = resolveQuality(options?.quality, profile);

  try {
    const fromCamera = await launchCamera(quality, profile);
    if (fromCamera) return fromCamera;
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Não foi possível') || error.message.includes('memória'))
    ) {
      throw error;
    }
  }

  return launchGallerySingle(quality, profile);
}

/** Seleção da galeria (fluxo de indústrias). Só aceita fotos tiradas hoje. */
export async function pickMultiplePhotos(options?: {
  quality?: number;
  selectionLimit?: number;
  profile?: PhotoCompressProfile;
}): Promise<string[]> {
  const profile = options?.profile ?? (isLowMemoryWebDevice() ? 'lowMemory' : 'default');
  const quality = resolveQuality(options?.quality, profile);
  const selectionLimit = Math.min(
    options?.selectionLimit ?? 20,
    isLowMemoryWebDevice() ? 5 : 20
  );

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
    try {
      const outcome = await acceptGalleryAsset(asset, profile);
      if ('rejected' in outcome) {
        if (outcome.rejected === 'not_today') rejectedNotToday += 1;
        else rejectedMissing += 1;
        continue;
      }
      accepted.push(outcome.uri);
    } catch {
      rejectedMissing += 1;
    }
  }

  const rejected = rejectedMissing + rejectedNotToday;
  if (rejected > 0) {
    const parts: string[] = [];
    if (rejectedNotToday > 0) {
      parts.push(`${rejectedNotToday} fora do dia de hoje`);
    }
    if (rejectedMissing > 0) {
      parts.push(`${rejectedMissing} sem data verificável / memória`);
    }
    showAlert(
      'Algumas fotos foram rejeitadas',
      `${rejected} foto(s) não aceitas (${parts.join('; ')}). Só entram fotos tiradas hoje.`
    );
  }

  return accepted;
}
