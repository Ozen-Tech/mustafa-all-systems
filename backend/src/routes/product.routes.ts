import { Router } from 'express';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/product.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// Rotas públicas (autenticadas)
router.get('/', authenticate, listProducts);

// Rotas protegidas (ADMIN)
router.post('/', authenticate, requireAdmin, createProduct);
router.put('/:id', authenticate, requireAdmin, updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;

