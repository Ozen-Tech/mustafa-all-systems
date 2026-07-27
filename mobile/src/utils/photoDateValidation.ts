/**
 * Valida se a data de captura é o dia civil de hoje em America/Sao_Paulo.
 * Nativo: usa EXIF do ImagePicker. PWA: lê EXIF dos bytes JPEG antes da compressão.
 */

export type PhotoDateCheck =
  | { ok: true }
  | { ok: false; reason: 'missing_date' | 'not_today' };

const TZ = 'America/Sao_Paulo';

/** Formato EXIF clássico: "YYYY:MM:DD HH:mm:ss" (às vezes com "/"). */
const EXIF_DATETIME_RE =
  /^(\d{4})[:/-](\d{2})[:/-](\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/;

/** ASCII "YYYY:MM:DD HH:mm:ss" nos bytes EXIF. */
const EXIF_ASCII_IN_BYTES_RE = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/g;

function calendarDayInSaoPaulo(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function todayInSaoPaulo(): string {
  return calendarDayInSaoPaulo(new Date());
}

/**
 * Extrai YYYY-MM-DD a partir de string EXIF ou Date.
 */
export function parseExifDateToDay(value: unknown): string | null {
  if (value == null) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return calendarDayInSaoPaulo(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return calendarDayInSaoPaulo(d);
  }

  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const m = trimmed.match(EXIF_DATETIME_RE);
  if (m) {
    const [, y, mo, d] = m;
    return `${y}-${mo}-${d}`;
  }

  const asDate = new Date(trimmed);
  if (!Number.isNaN(asDate.getTime())) {
    return calendarDayInSaoPaulo(asDate);
  }

  return null;
}

function pickExifDateField(exif: Record<string, unknown> | null | undefined): unknown {
  if (!exif || typeof exif !== 'object') return null;
  return (
    exif.DateTimeOriginal ??
    exif.DateTimeDigitized ??
    exif.DateTime ??
    exif.CreateDate ??
    exif.DateCreated ??
    null
  );
}

function dayCheckFromDay(day: string | null): PhotoDateCheck {
  if (!day) return { ok: false, reason: 'missing_date' };
  if (day !== todayInSaoPaulo()) return { ok: false, reason: 'not_today' };
  return { ok: true };
}

/**
 * Verifica se o EXIF do picker indica captura hoje.
 */
export function isPhotoTakenToday(exif: Record<string, unknown> | null | undefined): PhotoDateCheck {
  return dayCheckFromDay(parseExifDateToDay(pickExifDateField(exif)));
}

/**
 * Procura DateTimeOriginal / DateTime em segmentos EXIF de um JPEG (APP1).
 * Suficiente para PWA sem depender de biblioteca.
 */
export function extractCaptureDayFromJpegBytes(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return null; // não é JPEG
  }

  // Limita varredura aos primeiros ~256KB (EXIF costuma estar no início)
  const limit = Math.min(bytes.length, 256 * 1024);
  let ascii = '';
  for (let i = 0; i < limit; i++) {
    const c = bytes[i];
    ascii += c >= 32 && c <= 126 ? String.fromCharCode(c) : ' ';
  }

  // Prefere DateTimeOriginal (tag 0x9003) se o texto aparecer perto; senão qualquer data EXIF.
  const matches = [...ascii.matchAll(EXIF_ASCII_IN_BYTES_RE)];
  if (matches.length === 0) return null;

  // Em EXIF típico: DateTime (modificado), DateTimeOriginal, DateTimeDigitized — prioriza a 2ª se houver.
  const preferred = matches.length >= 2 ? matches[1] : matches[0];
  const [, y, mo, d] = preferred;
  return `${y}-${mo}-${d}`;
}

async function loadImageBytes(uri: string): Promise<ArrayBuffer | null> {
  try {
    if (uri.startsWith('data:')) {
      const base64 = uri.split(',')[1];
      if (!base64) return null;
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes.buffer;
    }
    const res = await fetch(uri);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch (error) {
    console.warn('[photoDate] falha ao ler bytes da imagem:', error);
    return null;
  }
}

/**
 * Validação completa para asset da galeria (nativo + PWA).
 * Ordem: EXIF do picker → EXIF nos bytes JPEG da URI (antes de comprimir).
 */
export async function checkGalleryAssetTakenToday(asset: {
  uri?: string | null;
  exif?: Record<string, unknown> | null;
}): Promise<PhotoDateCheck> {
  const fromPicker = isPhotoTakenToday(asset.exif ?? null);
  if (fromPicker.ok) return fromPicker;
  if (fromPicker.reason === 'not_today') return fromPicker;

  if (!asset.uri) {
    return { ok: false, reason: 'missing_date' };
  }

  const buffer = await loadImageBytes(asset.uri);
  if (!buffer) {
    return { ok: false, reason: 'missing_date' };
  }

  const dayFromBytes = extractCaptureDayFromJpegBytes(buffer);
  return dayCheckFromDay(dayFromBytes);
}

export function photoDateRejectMessage(reason: 'missing_date' | 'not_today'): {
  title: string;
  message: string;
} {
  if (reason === 'not_today') {
    return {
      title: 'Foto fora do dia',
      message:
        'Só são aceitas fotos tiradas hoje. Selecione uma foto de hoje ou tire agora com a câmera.',
    };
  }
  return {
    title: 'Data da foto não verificada',
    message:
      'Não foi possível verificar a data desta foto. Escolha outra foto de hoje ou use a câmera.',
  };
}
