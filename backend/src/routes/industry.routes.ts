import { Router } from 'express';
import {
  listIndustries,
  getIndustry,
  createIndustry,
  updateIndustry,
  deleteIndustry,
  getIndustryStats,
  getIndustryPhotoCoverage,
} from '../controllers/industry.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas (autenticadas)
router.get('/', authenticate, listIndustries);
router.get('/:id', authenticate, getIndustry);
router.get('/:id/stats', authenticate, getIndustryStats);
router.get('/:id/coverage', authenticate, getIndustryPhotoCoverage);

// Rotas protegidas (ADMIN)
router.post('/', authenticate, requireAdmin, createIndustry);
router.put('/:id', authenticate, requireAdmin, updateIndustry);
router.delete('/:id', authenticate, requireAdmin, deleteIndustry);

export default router;

