import { Router } from 'express';
import { getPresignedUrl, uploadPhotoDirect } from '../controllers/upload.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.post('/photo', getPresignedUrl);
router.post('/photo/direct', uploadPhotoDirect);

export default router;

