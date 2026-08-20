import { Router } from 'express';
import {
  listChains,
  getChain,
  createChain,
  updateChain,
  deleteChain,
  linkStoreToChain,
  unlinkStoreFromChain,
  listUnlinkedStores,
} from '../controllers/chain.controller';
import { authenticate, requireAdmin, requireSupervisor } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireSupervisor, listChains);
router.get('/unlinked-stores', authenticate, requireAdmin, listUnlinkedStores);
router.get('/:id', authenticate, requireSupervisor, getChain);
router.post('/', authenticate, requireAdmin, createChain);
router.put('/:id', authenticate, requireAdmin, updateChain);
router.delete('/:id', authenticate, requireAdmin, deleteChain);
router.post('/:id/link-store', authenticate, requireAdmin, linkStoreToChain);
router.delete('/stores/:storeId/link', authenticate, requireAdmin, unlinkStoreFromChain);

export default router;
