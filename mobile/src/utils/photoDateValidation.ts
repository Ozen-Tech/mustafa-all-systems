/**
 * Valida se a data de captura (EXIF) é o dia civil de hoje em America/Sao_Paulo.
 * Usado na galeria nativa — no PWA/web o picker não devolve EXIF confiável.
 */

export type PhotoDateCheck =
  | { ok: true }
  | { ok: false; reason: 'missing_date' | 'not_today' };

const TZ = 'America/Sao_Paulo';

/** Formato EXIF clássico: "YYYY:MM:DD HH:mm:ss" (às vezes com "/"). */
const EXIF_DATETIME_RE =
  /^(\d{4})[:/-](\d{2})[:/-](\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/;

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
    // epoch ms ou segundos
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

  // ISO-ish fallback
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

/**
 * Verifica se o asset da galeria foi capturado hoje (America/Sao_Paulo).
 */
export function isPhotoTakenToday(exif: Record<string, unknown> | null | undefined): PhotoDateCheck {
  const raw = pickExifDateField(exif);
  const day = parseExifDateToDay(raw);
  if (!day) {
    return { ok: false, reason: 'missing_date' };
  }
  if (day !== todayInSaoPaulo()) {
    return { ok: false, reason: 'not_today' };
  }
  return { ok: true };
}

export function photoDateRejectMessage(reason: 'missing_date' | 'not_today'): {
  title: string;
  message: string;
} {
  if (reason === 'not_today') {
    return {
      title: 'Foto fora do dia',
      message:
        'Só são aceitas fotos tiradas hoje. Tire a foto agora com a câmera.',
    };
  }
  return {
    title: 'Data da foto não verificada',
    message:
      'Não foi possível verificar a data desta foto. Use a câmera para tirar uma foto agora.',
  };
}
