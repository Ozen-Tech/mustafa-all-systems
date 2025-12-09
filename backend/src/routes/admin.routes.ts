import { Router } from 'express';
import { 
  seedDatabase, 
  listUsers, 
  createUser, 
  updateUser, 
  deleteUser, 
  getUser 
} from '../controllers/admin.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

// ⚠️ TEMPORÁRIO: Endpoint para seed
// Remover ou proteger fortemente em produção
router.post('/seed', seedDatabase);

// Rotas protegidas - requerem autenticação e role ADMIN
router.get('/users', authenticate, requireAdmin, listUsers);
router.post('/users', authenticate, requireAdmin, createUser);
router.get('/users/:id', authenticate, requireAdmin, getUser);
router.put('/users/:id', authenticate, requireAdmin, updateUser);
router.delete('/users/:id', authenticate, requireAdmin, deleteUser);

export default router;

