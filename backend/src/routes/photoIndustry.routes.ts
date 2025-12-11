import { Router } from 'express';
import {
  associatePhotoToIndustry,
  getPhotosByIndustry,
  getIndustryCoverage,
  getMissingCoverage,
} from '../controllers/photoIndustry.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// Rotas autenticadas
router.post('/associate', authenticate, associatePhotoToIndustry);
router.get('/industry/:industryId', authenticate, getPhotosByIndustry);
router.get('/coverage', authenticate, getIndustryCoverage);
router.get('/coverage/missing', authenticate, getMissingCoverage);

export default router;

