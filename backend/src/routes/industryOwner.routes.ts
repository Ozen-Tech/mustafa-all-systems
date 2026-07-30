import { Router } from 'express';
import { authenticate, requireIndustryOwner } from '../middleware/auth';
import {
  getMe,
  getFilters,
  getPhotos,
  getVisits,
  getAudit,
  getCoverage,
  getMetrics,
  exportReport,
} from '../controllers/industryOwner.controller';

const router = Router();

router.use(authenticate, requireIndustryOwner);

router.get('/me', getMe);
router.get('/:industryId/filters', getFilters);
router.get('/:industryId/photos', getPhotos);
router.get('/:industryId/visits', getVisits);
router.get('/:industryId/audit', getAudit);
router.get('/:industryId/coverage', getCoverage);
router.get('/:industryId/metrics', getMetrics);
router.get('/:industryId/export', exportReport);

export default router;
