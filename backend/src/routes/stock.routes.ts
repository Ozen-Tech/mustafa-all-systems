import { Router } from 'express';
import {
  stockUpload,
  createStockImport,
  listStockImports,
  getStockImport,
  getStoreStock,
  getStockOverview,
  getStockByStore,
  getSales,
  getUnmatchedFiliais,
  linkFilialToStore,
} from '../controllers/stock.controller';
import { authenticate, requireAdmin, requireSupervisor } from '../middleware/auth';

const router = Router();

// Importação (somente ADMIN)
router.post('/imports', authenticate, requireAdmin, stockUpload.single('file'), createStockImport);
router.get('/imports', authenticate, requireSupervisor, listStockImports);
router.get('/imports/:id', authenticate, requireSupervisor, getStockImport);

// Casamento de filiais (ADMIN)
router.get('/unmatched-filiais', authenticate, requireAdmin, getUnmatchedFiliais);
router.post('/stores/:storeId/link-filial', authenticate, requireAdmin, linkFilialToStore);

// Leitura para supervisores/admin
router.get('/overview', authenticate, requireSupervisor, getStockOverview);
router.get('/by-store', authenticate, requireSupervisor, getStockByStore);
router.get('/sales', authenticate, requireSupervisor, getSales);

// Estoque de uma loja (promotor no PWA e web)
router.get('/stores/:storeId/items', authenticate, getStoreStock);

export default router;
