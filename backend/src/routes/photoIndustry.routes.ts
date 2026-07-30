import { Router } from 'express';
import {
  associatePhotoToIndustry,
  getPhotosByIndustry,
  getIndustryCoverage,
  getMissingCoverage,
} from '../controllers/photoIndustry.controller';
import { authenticate, requireSupervisor } from '../middleware/auth';

const router = Router();

// Rotas autenticadas
router.post('/associate', authenticate, associatePhotoToIndustry);
router.get('/industry/:industryId', authenticate, requireSupervisor, getPhotosByIndustry);
router.get('/coverage', authenticate, requireSupervisor, getIndustryCoverage);
router.get('/coverage/missing', authenticate, requireSupervisor, getMissingCoverage);

export default router;

