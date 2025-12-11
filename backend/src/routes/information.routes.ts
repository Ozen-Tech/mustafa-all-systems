import { Router } from 'express';
import {
  uploadInformationFile,
  processInformationWithGemini,
  getInformationForPromoter,
  getInformationForIndustry,
  createInformation,
  listInformations,
} from '../controllers/information.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Rotas para promotores (mobile)
router.get('/promoter', authenticate, getInformationForPromoter);
router.get('/industry/:industryId', authenticate, getInformationForIndustry);

// Rotas protegidas (ADMIN)
router.post('/upload', authenticate, requireAdmin, uploadInformationFile);
router.post('/:id/process-gemini', authenticate, requireAdmin, processInformationWithGemini);
router.post('/', authenticate, requireAdmin, createInformation);
router.get('/', authenticate, requireAdmin, listInformations);

export default router;

