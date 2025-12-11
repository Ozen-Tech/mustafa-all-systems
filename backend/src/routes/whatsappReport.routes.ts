import { Router } from 'express';
import {
  generateReport,
  sendReportViaWhatsApp,
  scheduleReport,
  listReports,
} from '../controllers/whatsappReport.controller';
import { authenticate, requireSupervisor } from '../middleware/auth';

const router = Router();

// Rotas protegidas (SUPERVISOR ou ADMIN)
router.use(authenticate);
router.use(requireSupervisor);

router.post('/generate', generateReport);
router.post('/:id/send', sendReportViaWhatsApp);
router.post('/schedule', scheduleReport);
router.get('/', listReports);

export default router;

