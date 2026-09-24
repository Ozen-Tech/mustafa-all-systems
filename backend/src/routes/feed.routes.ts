import { Router } from 'express';
import {
  listFeed,
  createFeedEntry,
  patchFeedEntry,
  getOwnerDashboard,
} from '../controllers/feed.controller';
import { authenticate, requireSupervisor } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authenticate, requireSupervisor, getOwnerDashboard);
router.get('/', authenticate, requireSupervisor, listFeed);
router.post('/', authenticate, requireSupervisor, createFeedEntry);
router.patch('/:id', authenticate, requireSupervisor, patchFeedEntry);

export default router;
