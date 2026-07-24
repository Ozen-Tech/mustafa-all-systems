import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from './alertHelper';
import { ensurePersistablePhotoUri } from './photoUri';

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
  if (permission.status !== 'granted') return null;

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
  });

  if (!result.canceled && result.assets[0]?.uri) {
    return normalizePickedUri(result.assets[0].uri);
  }
  return null;
}

/** Câmera com fallback automático para galeria (essencial no PWA/desktop). */
export async function pickSinglePhoto(options?: { quality?: number }): Promise<string | null> {
  const quality = resolveQuality(options?.quality);

  try {
    const fromCamera = await launchCamera(quality);
    if (fromCamera) return fromCamera;
  } catch (error) {
    // Se a câmera abriu e a normalização falhou, não engolir — propaga.
    if (error instanceof Error && error.message.includes('Não foi possível ler')) {
      throw error;
    }
    // Câmera indisponível — segue para galeria
  }

  return launchGallerySingle(quality);
}

/** Seleção múltipla da galeria (fluxo de indústrias). */
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
  });

  if (result.canceled) return [];

  const uris: string[] = [];
  for (const asset of result.assets) {
    if (!asset.uri) continue;
    uris.push(await normalizePickedUri(asset.uri));
  }
  return uris;
}
