import { Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { DayAbsenceReason } from '@prisma/client';
import prisma from '../prisma/client';
import { AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import {
  generateAbsenceDocKey,
  getPublicUrl,
  uploadPhotoBuffer,
} from '../services/firebase-storage.service';

const MAX_DOC_BYTES = 12 * 1024 * 1024;

function toISODateBRT(d = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${y}-${m}-${day}`;
}

const upsertSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  reason: z.nativeEnum(DayAbsenceReason),
  note: z.string().max(2000).optional().nullable(),
  documentUrl: z.string().url(),
});

const listQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const absenceDocumentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_DOC_BYTES },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype?.startsWith('image/') ||
      file.mimetype === 'application/pdf';
    if (!ok) {
      cb(new Error('Envie uma imagem (JPG/PNG) ou PDF'));
      return;
    }
    cb(null, true);
  },
}).single('file');

export async function uploadAbsenceDocument(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.PROMOTER) {
      return res.status(403).json({ message: 'Apenas promotores podem enviar atestado' });
    }

    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ message: 'Arquivo obrigatório' });
    }
    if (file.size > MAX_DOC_BYTES) {
      return res.status(413).json({ message: 'Arquivo muito grande (máx. 12MB)' });
    }

    const contentType = file.mimetype || 'image/jpeg';
    const ext =
      contentType === 'application/pdf'
        ? 'pdf'
        : contentType.includes('png')
          ? 'png'
          : contentType.includes('webp')
            ? 'webp'
            : 'jpg';

    const key = generateAbsenceDocKey(req.userId, ext);
    await uploadPhotoBuffer(key, file.buffer, contentType);
    const url = getPublicUrl(key);

    res.json({ success: true, key, url, contentType });
  } catch (error: any) {
    console.error('uploadAbsenceDocument error:', error?.message || error);
    res.status(500).json({
      message: 'Falha ao enviar documento',
      detail: error?.message || 'Erro desconhecido',
    });
  }
}

/** Fallback JSON base64 (PWA) quando multipart falhar. */
export async function uploadAbsenceDocumentBase64(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.PROMOTER) {
      return res.status(403).json({ message: 'Apenas promotores podem enviar atestado' });
    }

    const schema = z.object({
      fileBase64: z.string().min(1),
      contentType: z.string().default('image/jpeg'),
    });
    const { fileBase64, contentType } = schema.parse(req.body);

    if (
      !contentType.startsWith('image/') &&
      contentType !== 'application/pdf'
    ) {
      return res.status(400).json({ message: 'Envie uma imagem ou PDF' });
    }

    const base64Data = fileBase64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    if (!buffer.length) {
      return res.status(400).json({ message: 'Arquivo inválido' });
    }
    if (buffer.length > MAX_DOC_BYTES) {
      return res.status(413).json({ message: 'Arquivo muito grande (máx. 12MB)' });
    }

    const ext =
      contentType === 'application/pdf'
        ? 'pdf'
        : contentType.includes('png')
          ? 'png'
          : 'jpg';
    const key = generateAbsenceDocKey(req.userId, ext);
    await uploadPhotoBuffer(key, buffer, contentType);
    const url = getPublicUrl(key);

    res.json({ success: true, key, url, contentType });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('uploadAbsenceDocumentBase64 error:', error?.message || error);
    res.status(500).json({ message: 'Falha ao enviar documento' });
  }
}

export async function upsertMyDayAbsence(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.PROMOTER) {
      return res.status(403).json({ message: 'Apenas promotores' });
    }

    const data = upsertSchema.parse(req.body);
    const date = data.date || toISODateBRT();

    const absence = await prisma.promoterDayAbsence.upsert({
      where: {
        promoterId_date: { promoterId: req.userId, date },
      },
      create: {
        promoterId: req.userId,
        date,
        reason: data.reason,
        note: data.note || null,
        documentUrl: data.documentUrl,
      },
      update: {
        reason: data.reason,
        note: data.note || null,
        documentUrl: data.documentUrl,
      },
    });

    res.status(201).json({ absence });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('upsertMyDayAbsence error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMyDayAbsences(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.PROMOTER) {
      return res.status(403).json({ message: 'Apenas promotores' });
    }

    const q = listQuerySchema.parse(req.query);
    const absences = await prisma.promoterDayAbsence.findMany({
      where: {
        promoterId: req.userId,
        ...(q.from || q.to
          ? {
              date: {
                ...(q.from ? { gte: q.from } : {}),
                ...(q.to ? { lte: q.to } : {}),
              },
            }
          : {}),
      },
      orderBy: { date: 'desc' },
      take: 60,
    });

    res.json({ absences });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('getMyDayAbsences error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function getMyTodayAbsence(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.PROMOTER) {
      return res.status(403).json({ message: 'Apenas promotores' });
    }

    const date = toISODateBRT();
    const absence = await prisma.promoterDayAbsence.findUnique({
      where: { promoterId_date: { promoterId: req.userId, date } },
    });

    res.json({ date, absence });
  } catch (error) {
    console.error('getMyTodayAbsence error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

export async function deleteMyDayAbsence(req: AuthRequest, res: Response) {
  try {
    if (!req.userId || req.userRole !== UserRole.PROMOTER) {
      return res.status(403).json({ message: 'Apenas promotores' });
    }

    const date = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .parse(req.params.date);

    await prisma.promoterDayAbsence.deleteMany({
      where: { promoterId: req.userId, date },
    });

    res.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('deleteMyDayAbsence error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
