import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from './alertHelper';
import { ensurePersistablePhotoUri } from './photoUri';
import {
  isPhotoTakenToday,
  photoDateRejectMessage,
} from './photoDateValidation';

/** Na web, qualidade alta gera base64 enorme e estoura rede/limite do Cloud Run. */
const DEFAULT_QUALITY = Platform.OS === 'web' ? 0.5 : 0.8;
const MAX_WEB_QUALITY = 0.55;

const GALLERY_BLOCKED_WEB_TITLE = 'Galeria indisponível';
const GALLERY_BLOCKED_WEB_MESSAGE =
  'No app web só é permitido tirar fotos pela câmera, para garantir que sejam do dia. Use o botão Câmera.';

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
    return normalizePickedUri(result.assets[0].uri);
  }
  return null;
}

function validateGalleryAsset(
  asset: ImagePicker.ImagePickerAsset
): { ok: true } | { ok: false; reason: 'missing_date' | 'not_today' } {
  const exif = (asset.exif ?? null) as Record<string, unknown> | null;
  return isPhotoTakenToday(exif);
}

async function launchGallerySingle(quality: number): Promise<string | null> {
  if (Platform.OS === 'web') {
    showAlert(GALLERY_BLOCKED_WEB_TITLE, GALLERY_BLOCKED_WEB_MESSAGE);
    return null;
  }

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

  const asset = result.assets[0];
  const check = validateGalleryAsset(asset);
  if (!check.ok) {
    const { title, message } = photoDateRejectMessage(check.reason);
    showAlert(title, message);
    return null;
  }

  return normalizePickedUri(asset.uri);
}

/**
 * Preferencialmente câmera. No PWA não há fallback para galeria (sem EXIF confiável).
 * No nativo, se a câmera falhar, tenta galeria com validação de data do dia.
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
    // Câmera indisponível — no nativo tenta galeria; no web alerta.
    if (Platform.OS === 'web') {
      showAlert(
        'Câmera indisponível',
        'Não foi possível abrir a câmera. Verifique a permissão e tente novamente. A galeria não é permitida no app web.'
      );
      return null;
    }
  }

  if (Platform.OS === 'web') {
    // Cancelou a câmera ou sem permissão já alertada — sem fallback galeria.
    return null;
  }

  return launchGallerySingle(quality);
}

/** Seleção múltipla da galeria (fluxo de indústrias). Bloqueada no PWA. */
export async function pickMultiplePhotos(options?: {
  quality?: number;
  selectionLimit?: number;
}): Promise<string[]> {
  if (Platform.OS === 'web') {
    showAlert(GALLERY_BLOCKED_WEB_TITLE, GALLERY_BLOCKED_WEB_MESSAGE);
    return [];
  }

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
    const check = validateGalleryAsset(asset);
    if (!check.ok) {
      if (check.reason === 'not_today') rejectedNotToday += 1;
      else rejectedMissing += 1;
      continue;
    }
    accepted.push(await normalizePickedUri(asset.uri));
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
      `${rejected} foto(s) não aceitas (${parts.join('; ')}). Só entram fotos tiradas hoje. Use a câmera se precisar.`
    );
  }

  return accepted;
}

/** True no PWA/web — UI pode esconder o botão Galeria. */
export function isGalleryBlockedOnPlatform(): boolean {
  return Platform.OS === 'web';
}
