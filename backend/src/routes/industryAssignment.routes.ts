import { Router } from 'express';
import {
  assignPromoterToIndustry,
  getPromoterIndustries,
  getIndustryPromoters,
  removeAssignment,
  setMyStoreIndustries,
  setPromoterStoreIndustries,
  getMyGeneralIndustries,
  setMyGeneralIndustries,
} from '../controllers/industryAssignment.controller';
import { authenticate, requireAdmin, requireSupervisor } from '../middleware/auth';

const router = Router();

// Promotor: onboarding geral (indústrias sem loja)
router.get('/me/general', authenticate, getMyGeneralIndustries);
router.put('/me/general', authenticate, setMyGeneralIndustries);

// Promotor: definir indústrias que atende em uma loja (onboarding)
router.post('/me/store/:storeId', authenticate, setMyStoreIndustries);

// Admin ou supervisor (escopo da rota): indústrias do promotor na loja
router.put('/promoter/:promoterId/store/:storeId', authenticate, requireSupervisor, setPromoterStoreIndustries);

// Rotas protegidas (ADMIN ou SUPERVISOR)
router.post('/', authenticate, requireAdmin, assignPromoterToIndustry);
router.get('/promoter/me', authenticate, async (req: any, res: any) => {
  req.params.promoterId = req.userId;
  return getPromoterIndustries(req, res);
});
router.get('/promoter/:promoterId', authenticate, getPromoterIndustries);
router.get('/industry/:industryId', authenticate, getIndustryPromoters);
router.delete('/:id', authenticate, requireAdmin, removeAssignment);

export default router;

