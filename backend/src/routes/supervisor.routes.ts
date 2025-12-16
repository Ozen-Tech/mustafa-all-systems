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
import { authenticate, requireAdmin, requireSupervisor } from '../middleware/auth';

const router = Router();

// Todas as rotas abaixo requerem autenticação
router.use(authenticate);

// 🔒 Rotas de dashboard e relatórios - acessíveis para SUPERVISOR e ADMIN
router.get('/dashboard', requireSupervisor, getDashboard);
router.get('/promoters', requireSupervisor, getPromoters);
router.get('/promoters/:id/performance', requireSupervisor, getPromoterPerformance);
router.get('/promoters/:id/visits', requireSupervisor, getPromoterVisits);
router.get('/promoters/:id/route', requireSupervisor, getPromoterRoute); // Rota histórica (visitas do dia)
router.get('/missing-photos', requireSupervisor, getMissingPhotos);
router.put('/promoters/:id/photo-quota', requireSupervisor, setPhotoQuota);
router.post('/export/report', requireSupervisor, exportReport);
router.get('/export/status/:id', requireSupervisor, getExportStatus);
router.get('/export/download/:id', requireSupervisor, downloadExport);

// 🔒 Rotas de configuração de rotas (assignments) - apenas ADMIN
router.post('/promoters/:promoterId/route-assignment', requireAdmin, setPromoterRoute);
router.get(
  '/promoters/:promoterId/route-assignment',
  requireAdmin,
  getPromoterRouteAssignment
);
router.put(
  '/promoters/:promoterId/stores/:storeId/hours',
  requireAdmin,
  updateStoreHours
);
router.get('/promoters/:promoterId/hours-report', requireAdmin, getPromoterHoursReport);
router.get('/promoters/hours-report', requireAdmin, getAllPromotersHoursReport);
router.get('/routes', requireAdmin, getAllRoutes);
router.get('/stores/available', requireAdmin, getAvailableStores);

// 🔒 Rotas de gerenciamento de lojas - SUPERVISOR e ADMIN
router.get('/stores', requireSupervisor, getAllStores);
router.get('/stores/:id', requireSupervisor, getStore);
router.post('/stores', requireSupervisor, createStore);
router.put('/stores/:id', requireSupervisor, updateStore);
router.delete('/stores/:id', requireSupervisor, deleteStore);

export default router;

