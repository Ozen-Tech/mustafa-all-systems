import { Router } from 'express';
import {
  assignPromoterToIndustry,
  getPromoterIndustries,
  getIndustryPromoters,
  removeAssignment,
} from '../controllers/industryAssignment.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Rotas protegidas (ADMIN ou SUPERVISOR)
router.post('/', authenticate, requireAdmin, assignPromoterToIndustry);
router.get('/promoter/me', authenticate, async (req: any, res: any) => {
  // Endpoint para buscar indústrias do próprio promotor logado
  req.params.promoterId = req.userId;
  return getPromoterIndustries(req, res);
});
router.get('/promoter/:promoterId', authenticate, getPromoterIndustries);
router.get('/industry/:industryId', authenticate, getIndustryPromoters);
router.delete('/:id', authenticate, requireAdmin, removeAssignment);

export default router;

