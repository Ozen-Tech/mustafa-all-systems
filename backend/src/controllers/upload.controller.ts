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
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.errors });
    }
    
    console.error('Presigned URL error:', error);
    
    // Tratamento específico para erro 412 (permissões do Firebase)
    if (error.code === 412 || error.message?.includes('412') || error.message?.includes('missing necessary permissions')) {
      return res.status(412).json({ 
        error: {
          code: 412,
          message: 'A required service account is missing necessary permissions. Please resolve by visiting the Storage page of the Firebase Console and re-linking your Firebase bucket or see this FAQ for more info: https://firebase.google.com/support/faq#storage-accounts. If you recently made changes to your service account, please wait a few minutes for the changes to propagate through our systems and try again.',
          details: 'A conta de serviço do Firebase não tem as permissões necessárias. Veja docs/SOLUCAO_ERRO_412_FIREBASE.md para mais detalhes.'
        }
      });
    }
    
    res.status(500).json({ message: 'Internal server error' });
  }
}

