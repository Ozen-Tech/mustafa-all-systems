/**
 * Utilitários para URIs de foto locais (nativo + web/PWA).
 */

const WEB_MAX_EDGE = 1600;
const WEB_JPEG_QUALITY = 0.55;

export function isLocalPhotoUri(uri: string | undefined | null): boolean {
  if (!uri) return false;
  if (uri.startsWith('file://')) return true;
  if (uri.startsWith('blob:')) return true;
  if (uri.startsWith('data:image/')) return true;
  return false;
}

/** blob: é volátil no PWA — revoga ao abrir câmera/galeria de novo. */
export function isFragilePhotoUri(uri: string | undefined | null): boolean {
  return !!uri && uri.startsWith('blob:');
}

export function isStableLocalPhotoUri(uri: string | undefined | null): boolean {
  if (!uri) return false;
  if (uri.startsWith('data:image/')) return true;
  if (uri.startsWith('file://')) return true;
  return false;
}

export function isPendingLocalPhoto(photo: {
  uri?: string;
  url?: string;
  invalid?: boolean;
}): boolean {
  if (photo.invalid) return false;
  if (photo.url && !photo.uri) return false;
  if (photo.url && photo.url.includes('placeholder.com')) {
    return isStableLocalPhotoUri(photo.uri);
  }
  return isStableLocalPhotoUri(photo.uri);
}

function loadImageFromUri(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Falha ao carregar imagem para compressão'));
    img.src = uri;
  });
}

/** Redimensiona/comprime data URL no browser (PWA). */
export async function compressDataUrl(
  dataUrl: string,
  maxEdge = WEB_MAX_EDGE,
  quality = WEB_JPEG_QUALITY
): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;

  try {
    const img = await loadImageFromUri(dataUrl);
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return dataUrl;
  }
}

/** Converte URI volátil (blob) em data URL persistível no localStorage. */
export async function toPersistablePhotoUri(uri: string): Promise<string> {
  if (uri.startsWith('data:image/')) return uri;
  if (uri.startsWith('file://')) return uri;

  try {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Falha ao ler a imagem'));
      reader.readAsDataURL(blob);
    });
  } catch (error: any) {
    const msg = String(error?.message || error || '');
    if (msg.toLowerCase().includes('failed to fetch') || uri.startsWith('blob:')) {
      throw new Error('Foto local inválida. Tire ou selecione a foto novamente.');
    }
    throw error;
  }
}

/**
 * Garante URI estável no web: blob → data URL + compressão.
 * No nativo, devolve a URI original (file://).
 */
export async function ensurePersistablePhotoUri(
  uri: string,
  options?: { compress?: boolean }
): Promise<string> {
  const persistable = await toPersistablePhotoUri(uri);
  if (options?.compress === false) return persistable;
  if (typeof document === 'undefined') return persistable;
  if (!persistable.startsWith('data:image/')) return persistable;
  return compressDataUrl(persistable);
}

export async function ensurePersistablePhotoUris(
  uris: string[],
  options?: { compress?: boolean }
): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris) {
    out.push(await ensurePersistablePhotoUri(uri, options));
  }
  return out;
}
