import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { 
  getPresignedUploadUrl as getFirebaseUploadUrl, 
  generatePhotoKey as generateFirebaseKey,
  getPublicUrl,
  getSignedUrlForPhoto
} from '../services/firebase-storage.service';
import { PhotoType } from '../types';

const presignedUrlSchema = z.object({
  visitId: z.string().uuid(),
  type: z.nativeEnum(PhotoType),
  contentType: z.string().default('image/jpeg'),
  extension: z.string().default('jpg'),
});

export async function getPresignedUrl(req: AuthRequest, res: Response) {
  try {
    const { visitId, type, contentType, extension } = presignedUrlSchema.parse(req.body);

    // Verify visit exists and belongs to the user (if promoter)
    // This will be implemented when we add visit controllers

    const key = generateFirebaseKey(visitId, type, extension);
    const presignedUrl = await getFirebaseUploadUrl(key, { contentType });

    // URL final para acesso à foto (pública ou assinada)
    const finalUrl = getPublicUrl(key);

    res.json({
      presignedUrl,
      key,
      url: finalUrl,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    console.error('Presigned URL error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

