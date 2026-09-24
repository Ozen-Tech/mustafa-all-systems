import { Router } from 'express';
import {
  listGoals,
  upsertGoal,
  deleteGoal,
  getGoalsProgress,
} from '../controllers/goal.controller';
import { authenticate, requireAdmin, requireSupervisor } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireSupervisor, listGoals);
router.get('/progress', authenticate, requireSupervisor, getGoalsProgress);
router.post('/', authenticate, requireAdmin, upsertGoal);
router.delete('/:id', authenticate, requireAdmin, deleteGoal);

export default router;
