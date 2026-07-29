import { Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { AuthRequest } from '../middleware/auth';
import {
  getPresignedUploadUrl as getFirebaseUploadUrl,
  generatePhotoKey as generateFirebaseKey,
  getPublicUrl,
  uploadPhotoBuffer,
} from '../services/firebase-storage.service';
import { PhotoType } from '../types';

const MAX_PHOTO_BYTES = 12 * 1024 * 1024; // 12MB

const presignedUrlSchema = z.object({
  visitId: z.string().uuid(),
  type: z.nativeEnum(PhotoType),
  contentType: z.string().default('image/jpeg'),
  extension: z.string().default('jpg'),
});

const directUploadSchema = presignedUrlSchema.extend({
  imageBase64: z.string().min(1),
});

/** Upload binário (multipart) — evita base64 no JSON, bem mais leve no PWA. */
export const photoBinaryUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PHOTO_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) {
      cb(new Error('Apenas imagens são permitidas'));
      return;
    }
    cb(null, true);
  },
}).single('file');

export async function uploadPhotoDirect(req: AuthRequest, res: Response) {
  try {
    const { visitId, type, contentType, extension, imageBase64 } = directUploadSchema.parse(req.body);

    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (!buffer.length) {
      return res.status(400).json({ message: 'Imagem inválida ou vazia' });
    }
    if (buffer.length > MAX_PHOTO_BYTES) {
      return res.status(413).json({ message: 'Imagem muito grande (máx. 12MB)' });
    }

    const key = generateFirebaseKey(visitId, type, extension);
    await uploadPhotoBuffer(key, buffer, contentType);
    const url = getPublicUrl(key);

    res.json({ success: true, key, url });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Direct photo upload error:', error?.message || error);
    res.status(500).json({
      message: 'Falha ao enviar foto',
      detail: error?.message || 'Erro desconhecido',
    });
  }
}

export async function uploadPhotoDirectBinary(req: AuthRequest, res: Response) {
  try {
    const meta = presignedUrlSchema.parse({
      visitId: req.body?.visitId,
      type: req.body?.type,
      contentType: req.body?.contentType || req.file?.mimetype || 'image/jpeg',
      extension: req.body?.extension || 'jpg',
    });

    const file = req.file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ message: 'Arquivo de imagem obrigatório' });
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return res.status(413).json({ message: 'Imagem muito grande (máx. 12MB)' });
    }

    const key = generateFirebaseKey(meta.visitId, meta.type, meta.extension);
    await uploadPhotoBuffer(key, file.buffer, meta.contentType);
    const url = getPublicUrl(key);

    res.json({ success: true, key, url });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Direct binary photo upload error:', error?.message || error);
    res.status(500).json({
      message: 'Falha ao enviar foto',
      detail: error?.message || 'Erro desconhecido',
    });
  }
}

export async function getPresignedUrl(req: AuthRequest, res: Response) {
  try {
    const { visitId, type, contentType, extension } = presignedUrlSchema.parse(req.body);

    const key = generateFirebaseKey(visitId, type, extension);
    const presignedUrl = await getFirebaseUploadUrl(key, { contentType });
    const finalUrl = getPublicUrl(key);

    res.json({
      presignedUrl,
      key,
      url: finalUrl,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }

    console.error('Presigned URL error:', error);

    if (
      error.code === 412 ||
      error.message?.includes('412') ||
      error.message?.includes('missing necessary permissions')
    ) {
      return res.status(412).json({
        error: {
          code: 412,
          message:
            'A required service account is missing necessary permissions. Please resolve by visiting the Storage page of the Firebase Console and re-linking your Firebase bucket or see this FAQ for more info: https://firebase.google.com/support/faq#storage-accounts. If you recently made changes to your service account, please wait a few minutes for the changes to propagate through our systems and try again.',
          details:
            'A conta de serviço do Firebase não tem as permissões necessárias. Veja docs/SOLUCAO_ERRO_412_FIREBASE.md para mais detalhes.',
        },
      });
    }

    res.status(500).json({ message: 'Internal server error' });
  }
}
