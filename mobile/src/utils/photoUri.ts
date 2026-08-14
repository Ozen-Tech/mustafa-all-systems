/**
 * Utilitários para URIs de foto locais (nativo + web/PWA).
 *
 * No Android low-end (ex.: Galaxy A16), converter a foto cheia em data URL
 * antes de comprimir estoura a memória e o Chrome mata a aba (volta à Home).
 * Por isso comprimimos blob → canvas pequeno → data URL leve.
 */

/**
 * Evidências no dashboard (indústria / visita).
 * 1280px @ ~0.68 fica legível no admin sem decodificar full-res no celular
 * (o caminho createImageBitmap → canvas pequeno evita OOM).
 */
const WEB_MAX_EDGE = 1280;
const WEB_JPEG_QUALITY = 0.68;
const WEB_UPLOAD_TARGET_BYTES = 420_000;

/** Check-in fachada — prioriza estabilidade em low RAM. */
const CHECKIN_MAX_EDGE = 720;
const CHECKIN_JPEG_QUALITY = 0.42;
const CHECKIN_UPLOAD_TARGET_BYTES = 180_000;

/** Só quando o caller pede explicitamente lowMemory. */
const LOWMEM_MAX_EDGE = 640;
const LOWMEM_JPEG_QUALITY = 0.35;
const LOWMEM_UPLOAD_TARGET_BYTES = 140_000;

export type PhotoCompressProfile = 'default' | 'checkin' | 'lowMemory';

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

/** Estimativa do tamanho binário a partir de data URL. */
export function estimateDataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor(b64.length * 0.75);
}

/** Galaxy A-series / pouca RAM / Samsung Internet → perfil low-memory. */
export function isLowMemoryWebDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = (navigator.userAgent || '').toLowerCase();
  const deviceMemory = (navigator as any).deviceMemory as number | undefined;

  if (typeof deviceMemory === 'number' && deviceMemory > 0 && deviceMemory <= 4) {
    return true;
  }
  if (ua.includes('samsungbrowser')) return true;
  // Galaxy A01–A56 etc. (ex.: SM-A165M = A16)
  if (/sm-a\d{2,3}/i.test(ua) || /galaxy a\d{1,2}/i.test(ua)) return true;
  return false;
}

function resolveProfile(profile?: PhotoCompressProfile): {
  maxEdge: number;
  quality: number;
  targetBytes: number;
  steps: Array<[number, number]>;
} {
  // Perfil explícito sempre vence — senão Galaxy A / Samsung Internet
  // forçava lowMemory em TODAS as fotos e o dashboard ficava ilegível.
  if (profile === 'checkin') {
    return {
      maxEdge: CHECKIN_MAX_EDGE,
      quality: CHECKIN_JPEG_QUALITY,
      targetBytes: CHECKIN_UPLOAD_TARGET_BYTES,
      steps: [
        [720, 0.42],
        [640, 0.36],
        [560, 0.32],
        [480, 0.28],
      ],
    };
  }
  if (profile === 'lowMemory') {
    return {
      maxEdge: LOWMEM_MAX_EDGE,
      quality: LOWMEM_JPEG_QUALITY,
      targetBytes: LOWMEM_UPLOAD_TARGET_BYTES,
      steps: [
        [640, 0.35],
        [560, 0.3],
        [480, 0.26],
        [400, 0.22],
      ],
    };
  }
  if (profile === 'default') {
    return {
      maxEdge: WEB_MAX_EDGE,
      quality: WEB_JPEG_QUALITY,
      targetBytes: WEB_UPLOAD_TARGET_BYTES,
      steps: [
        [1280, 0.68],
        [1100, 0.6],
        [960, 0.55],
        [800, 0.5],
      ],
    };
  }

  // Sem perfil: low-RAM → check-in-safe; demais → qualidade de dashboard.
  if (isLowMemoryWebDevice()) {
    return resolveProfile('checkin');
  }
  return resolveProfile('default');
}

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

async function uriToBlob(uri: string): Promise<Blob> {
  if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
    const response = await fetch(uri);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.blob();
  }
  const response = await fetch(uri);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.blob();
}

/**
 * Comprime sem materializar a foto em resolução cheia como data URL.
 * Preferência: createImageBitmap(blob) → canvas pequeno → JPEG.
 */
export async function compressBlobToJpegDataUrl(
  blob: Blob,
  maxEdge: number,
  quality: number
): Promise<string> {
  if (typeof document === 'undefined') {
    throw new Error('compressBlobToJpegDataUrl só funciona na web');
  }

  let bitmap: ImageBitmap | null = null;
  let objectUrl: string | null = null;
  let img: HTMLImageElement | null = null;

  try {
    if (typeof createImageBitmap === 'function') {
      bitmap = await createImageBitmap(blob);
      const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2d indisponível');
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      bitmap = null;

      const out = canvas.toDataURL('image/jpeg', quality);
      canvas.width = 0;
      canvas.height = 0;
      return out;
    }

    // Fallback: Image via object URL (não via data URL full-res)
    objectUrl = URL.createObjectURL(blob);
    img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Falha ao carregar imagem'));
      el.src = objectUrl!;
    });

    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d indisponível');
    ctx.drawImage(img, 0, 0, width, height);
    img.src = '';
    img = null;
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;

    const out = canvas.toDataURL('image/jpeg', quality);
    canvas.width = 0;
    canvas.height = 0;
    return out;
  } finally {
    if (bitmap) {
      try {
        bitmap.close();
      } catch {
        /* ignore */
      }
    }
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* ignore */
      }
    }
  }
}

/** Redimensiona/comprime data URL no browser (PWA). */
export async function compressDataUrl(
  dataUrl: string,
  maxEdge = WEB_MAX_EDGE,
  quality = WEB_JPEG_QUALITY
): Promise<string> {
  if (typeof document === 'undefined') return dataUrl;
  try {
    const blob = await uriToBlob(dataUrl);
    return await compressBlobToJpegDataUrl(blob, maxEdge, quality);
  } catch {
    return dataUrl;
  }
}

/**
 * Pipeline principal web: URI/blob → JPEG pequeno, sem data URL full-res.
 */
export async function compressLocalUriForWeb(
  uri: string,
  profile?: PhotoCompressProfile
): Promise<string> {
  const cfg = resolveProfile(profile);
  let blob = await uriToBlob(uri);

  // Revoga blob: original o quanto antes — libera memória do Chrome.
  if (uri.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(uri);
    } catch {
      /* ignore */
    }
  }

  let out = await compressBlobToJpegDataUrl(blob, cfg.maxEdge, cfg.quality);
  await yieldToUi();

  for (const [edge, quality] of cfg.steps) {
    if (estimateDataUrlBytes(out) <= cfg.targetBytes) break;
    out = await compressDataUrl(out, edge, quality);
    await yieldToUi();
  }

  return out;
}

/**
 * Comprime em passos até caber no alvo. Usado no upload PWA.
 */
export async function preparePhotoForWebUpload(
  uri: string,
  profile?: PhotoCompressProfile
): Promise<string> {
  if (!uri.startsWith('data:image/') && !uri.startsWith('blob:') && !uri.startsWith('http')) {
    return uri;
  }
  return compressLocalUriForWeb(uri, profile ?? 'default');
}

/** Converte URI volátil (blob) em data URL — preferir compressLocalUriForWeb na web. */
export async function toPersistablePhotoUri(uri: string): Promise<string> {
  if (uri.startsWith('data:image/')) return uri;
  if (uri.startsWith('file://')) return uri;

  try {
    // Sempre comprime na web para não materializar full-res em base64.
    if (typeof document !== 'undefined') {
      return await compressLocalUriForWeb(uri);
    }

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
  options?: { compress?: boolean; profile?: PhotoCompressProfile }
): Promise<string> {
  if (typeof document === 'undefined') {
    if (uri.startsWith('data:image/') || uri.startsWith('file://')) return uri;
    return toPersistablePhotoUri(uri);
  }
  if (options?.compress === false && uri.startsWith('data:image/')) return uri;
  return compressLocalUriForWeb(uri, options?.profile);
}

export async function ensurePersistablePhotoUris(
  uris: string[],
  options?: { compress?: boolean; profile?: PhotoCompressProfile }
): Promise<string[]> {
  const out: string[] = [];
  for (const uri of uris) {
    out.push(await ensurePersistablePhotoUri(uri, options));
    await yieldToUi();
  }
  return out;
}
