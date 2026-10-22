import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getTasks, completeTask, getSkuStoreMatrix } from '../controllers/task.controller';

const router = Router();

router.use(authenticate);

// Promotor
router.get('/', getTasks);
router.post('/complete', completeTask);

// Supervisor/Admin
router.get('/sku-matrix', getSkuStoreMatrix);

export default router;
