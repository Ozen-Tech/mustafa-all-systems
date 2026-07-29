import { Router } from 'express';
import {
  getPresignedUrl,
  uploadPhotoDirect,
  uploadPhotoDirectBinary,
  photoBinaryUpload,
} from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.post('/photo', getPresignedUrl);
router.post('/photo/direct', uploadPhotoDirect);
/** Multipart binário — preferido no PWA (menos memória que JSON base64). */
router.post('/photo/direct-binary', photoBinaryUpload, uploadPhotoDirectBinary);

export default router;
