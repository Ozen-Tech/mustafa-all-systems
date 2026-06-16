import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { showAlert } from './alertHelper';

const DEFAULT_QUALITY = Platform.OS === 'web' ? 0.55 : 0.8;

async function launchCamera(quality: number): Promise<string | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality,
    allowsEditing: false,
  });

  if (!result.canceled && result.assets[0]?.uri) {
    return result.assets[0].uri;
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
    return result.assets[0].uri;
  }
  return null;
}

/** Câmera com fallback automático para galeria (essencial no PWA/desktop). */
export async function pickSinglePhoto(options?: { quality?: number }): Promise<string | null> {
  const quality = options?.quality ?? DEFAULT_QUALITY;

  try {
    const fromCamera = await launchCamera(quality);
    if (fromCamera) return fromCamera;
  } catch {
    // Câmera indisponível — segue para galeria
  }

  return launchGallerySingle(quality);
}

/** Seleção múltipla da galeria (fluxo de indústrias). */
export async function pickMultiplePhotos(options?: {
  quality?: number;
  selectionLimit?: number;
}): Promise<string[]> {
  const quality = options?.quality ?? DEFAULT_QUALITY;
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
  return result.assets.map((asset) => asset.uri).filter(Boolean);
}
