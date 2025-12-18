import { Router } from 'express';
import {
  getStoreIndustries,
  addIndustryToStore,
  removeIndustryFromStore,
  updateStoreIndustries,
  getAllStoreIndustries,
} from '../controllers/storeIndustry.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Rota para listar todas as lojas com suas indústrias (para dashboard)
router.get('/', authenticate, getAllStoreIndustries);

// Rotas por loja
// GET - qualquer usuário autenticado pode ver
router.get('/:storeId', authenticate, getStoreIndustries);

// POST, PUT, DELETE - apenas ADMIN pode modificar
router.post('/:storeId', authenticate, requireAdmin, addIndustryToStore);
router.put('/:storeId', authenticate, requireAdmin, updateStoreIndustries);
router.delete('/:storeId/:industryId', authenticate, requireAdmin, removeIndustryFromStore);

export default router;


