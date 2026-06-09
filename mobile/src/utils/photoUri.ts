/**
 * Utilitários para URIs de foto locais (nativo + web/PWA).
 */
export function isLocalPhotoUri(uri: string | undefined | null): boolean {
  if (!uri) return false;
  if (uri.startsWith('file://')) return true;
  if (uri.startsWith('blob:')) return true;
  if (uri.startsWith('data:image/')) return true;
  return false;
}

export function isPendingLocalPhoto(photo: { uri?: string; url?: string }): boolean {
  if (photo.url && !photo.uri) return false;
  if (photo.url && photo.url.includes('placeholder.com')) return isLocalPhotoUri(photo.uri);
  return isLocalPhotoUri(photo.uri);
}

/** Converte URI volátil (blob) em data URL persistível no localStorage. */
export async function toPersistablePhotoUri(uri: string): Promise<string> {
  if (uri.startsWith('data:image/')) return uri;
  if (uri.startsWith('file://')) return uri;

  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
