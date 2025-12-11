import { Router } from 'express';
import {
  getDashboard,
  getPromoterPerformance,
  getPromoterVisits,
  getPromoterRoute,
  getMissingPhotos,
  setPhotoQuota,
  exportReport,
} from '../controllers/supervisor.controller';
import { getPromoters } from '../controllers/promoters.controller';
import { downloadExport, getExportStatus } from '../controllers/export.controller';
import {
  setPromoterRoute,
  getPromoterRoute as getPromoterRouteAssignment,
  getAllRoutes,
  getAvailableStores,
  updateStoreHours,
  getPromoterHoursReport,
  getAllPromotersHoursReport,
} from '../controllers/route.controller';
import {
  createStore,
  updateStore,
  deleteStore,
  getAllStores,
  getStore,
} from '../controllers/store.controller';
import { authenticate, requireSupervisor } from '../middleware/auth';

const router = Router();

router.use(authenticate);
router.use(requireSupervisor);

router.get('/dashboard', getDashboard);
router.get('/promoters', getPromoters);
router.get('/promoters/:id/performance', getPromoterPerformance);
router.get('/promoters/:id/visits', getPromoterVisits);
router.get('/promoters/:id/route', getPromoterRoute); // Rota histórica (visitas do dia)
router.get('/missing-photos', getMissingPhotos);
router.put('/promoters/:id/photo-quota', setPhotoQuota);
router.post('/export/report', exportReport);
router.get('/export/status/:id', getExportStatus);
router.get('/export/download/:id', downloadExport);

// Rotas de configuração de rotas (assignments)
router.post('/promoters/:promoterId/route-assignment', setPromoterRoute);
router.get('/promoters/:promoterId/route-assignment', getPromoterRouteAssignment);
router.put('/promoters/:promoterId/stores/:storeId/hours', updateStoreHours);
router.get('/promoters/:promoterId/hours-report', getPromoterHoursReport);
router.get('/promoters/hours-report', getAllPromotersHoursReport);
router.get('/routes', getAllRoutes);
router.get('/stores/available', getAvailableStores);

// Rotas de gerenciamento de lojas
router.get('/stores', getAllStores);
router.get('/stores/:id', getStore);
router.post('/stores', createStore);
router.put('/stores/:id', updateStore);
router.delete('/stores/:id', deleteStore);

export default router;

