import { Router } from 'express';
import {
  orderUpload,
  createOrderImport,
  listOrderImports,
  getOrderImport,
  listOrders,
  getOrder,
  getOrdersSummary,
  getUnmatchedOrderFiliais,
} from '../controllers/order.controller';
import { authenticate, requireAdmin, requireSupervisor } from '../middleware/auth';

const router = Router();

router.post('/imports', authenticate, requireAdmin, orderUpload.single('file'), createOrderImport);
router.get('/imports', authenticate, requireSupervisor, listOrderImports);
router.get('/imports/:id', authenticate, requireSupervisor, getOrderImport);

router.get('/unmatched-filiais', authenticate, requireAdmin, getUnmatchedOrderFiliais);
router.get('/summary', authenticate, requireSupervisor, getOrdersSummary);
router.get('/', authenticate, requireSupervisor, listOrders);
router.get('/:id', authenticate, requireSupervisor, getOrder);

export default router;
