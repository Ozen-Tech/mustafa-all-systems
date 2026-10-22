import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMissions, completeMission, createMission } from '../controllers/mission.controller';

const router = Router();

router.use(authenticate);

// Promotor
router.get('/', getMissions);
router.post('/complete', completeMission);

// Admin/Supervisor
router.post('/', createMission);

export default router;
