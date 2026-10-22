import { create } from 'zustand';
import { syncService } from '../services/syncService';
import { getDB, ActiveVisit, CachedStore, CachedTask } from '../services/db';
import { api, Store, Task } from '../services/api';

interface VisitState {
  activeVisit: ActiveVisit | null;
  stores: Store[];
  completedStoreIds: string[];
  currentStoreTasks: Task[];
  isLoading: boolean;
  error: string | null;
  pendingSync: { checkIns: number; photos: number; tasks: number; total: number };
  isOnline: boolean;

  loadStores: () => Promise<void>;
  loadActiveVisit: () => Promise<void>;
  loadTasksForStore: (storeId: string) => Promise<void>;
  
  startCheckIn: (store: Store, photo: Blob | null, location: GeolocationPosition | null, gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable') => Promise<{ success: boolean; error?: string }>;
  finishCheckout: (photo: Blob | null, location: GeolocationPosition | null, gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable') => Promise<{ success: boolean; error?: string }>;
  completeTask: (task: Task, action: string, details: Record<string, unknown>) => Promise<void>;
  
  refreshPendingCount: () => Promise<void>;
  triggerSync: () => Promise<void>;
}

export const useVisitStore = create<VisitState>((set, get) => ({
  activeVisit: null,
  stores: [],
  completedStoreIds: [],
  currentStoreTasks: [],
  isLoading: false,
  error: null,
  pendingSync: { checkIns: 0, photos: 0, tasks: 0, total: 0 },
  isOnline: navigator.onLine,

  loadStores: async () => {
    set({ isLoading: true, error: null });
    const db = await getDB();

    try {
      // Tenta API primeiro
      if (navigator.onLine) {
        const response = await api.getStores();
        set({ 
          stores: response.stores, 
          completedStoreIds: response.completedStoreIdsToday,
          isLoading: false 
        });

        // Cacheia no IndexedDB
        for (const store of response.stores) {
          const cached: CachedStore = {
            id: store.id,
            name: store.name,
            code: store.code,
            filialCode: store.filialCode,
            address: store.address,
            latitude: store.latitude,
            longitude: store.longitude,
            state: store.state,
            hasCoordinates: store.latitude !== 0 && store.longitude !== 0,
            cachedAt: new Date().toISOString()
          };
          await db.put('cachedStores', cached);
        }
      } else {
        // Offline: usa cache
        const cached = await db.getAll('cachedStores');
        set({ 
          stores: cached.map(c => ({
            id: c.id,
            name: c.name,
            code: c.code,
            filialCode: c.filialCode,
            address: c.address,
            latitude: c.latitude,
            longitude: c.longitude,
            state: c.state
          })),
          isLoading: false 
        });
      }
    } catch (error: unknown) {
      // Fallback para cache
      const cached = await db.getAll('cachedStores');
      if (cached.length > 0) {
        set({ 
          stores: cached.map(c => ({
            id: c.id,
            name: c.name,
            code: c.code,
            filialCode: c.filialCode,
            address: c.address,
            latitude: c.latitude,
            longitude: c.longitude,
            state: c.state
          })),
          isLoading: false 
        });
      } else {
        const message = error instanceof Error ? error.message : 'Erro desconhecido';
        set({ error: message, isLoading: false });
      }
    }
  },

  loadActiveVisit: async () => {
    const activeVisit = await syncService.getActiveVisit();
    set({ activeVisit });
  },

  loadTasksForStore: async (storeId: string) => {
    set({ isLoading: true });
    const db = await getDB();

    try {
      if (navigator.onLine) {
        const response = await api.getTasks(storeId);
        set({ currentStoreTasks: response.tasks, isLoading: false });

        // Cacheia tarefas
        for (const task of response.tasks) {
          const cached: CachedTask = {
            id: task.id,
            storeId: task.storeId,
            sku: task.sku,
            productName: task.productName,
            industryName: task.industryName,
            industryId: task.industryId,
            alertType: task.alertType,
            stockLoja: task.stockLoja,
            stockCD: task.stockCD,
            lastSale: task.lastSale,
            dde: task.dde,
            priority: task.priority,
            date: new Date().toISOString().split('T')[0],
            cachedAt: new Date().toISOString()
          };
          await db.put('cachedTasks', cached);
        }
      } else {
        const cached = await db.getAllFromIndex('cachedTasks', 'by-store', storeId);
        set({ 
          currentStoreTasks: cached.map(c => ({
            id: c.id,
            storeId: c.storeId,
            sku: c.sku,
            productName: c.productName,
            industryName: c.industryName,
            industryId: c.industryId,
            alertType: c.alertType,
            stockLoja: c.stockLoja,
            stockCD: c.stockCD,
            lastSale: c.lastSale,
            dde: c.dde,
            priority: c.priority
          })),
          isLoading: false 
        });
      }
    } catch {
      const cached = await db.getAllFromIndex('cachedTasks', 'by-store', storeId);
      set({ 
        currentStoreTasks: cached.map(c => ({
          id: c.id,
          storeId: c.storeId,
          sku: c.sku,
          productName: c.productName,
          industryName: c.industryName,
          industryId: c.industryId,
          alertType: c.alertType,
          stockLoja: c.stockLoja,
          stockCD: c.stockCD,
          lastSale: c.lastSale,
          dde: c.dde,
          priority: c.priority
        })),
        isLoading: false 
      });
    }
  },

  startCheckIn: async (store, photo, location, gpsStatus) => {
    try {
      const { user } = await import('./authStore').then(m => m.useAuthStore.getState());
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      const result = await syncService.saveCheckIn({
        storeId: store.id,
        storeName: store.name,
        storeAddress: store.address,
        promoterId: user.id,
        latitude: location?.coords.latitude ?? null,
        longitude: location?.coords.longitude ?? null,
        gpsStatus,
        photoBlob: photo
      });

      await get().loadActiveVisit();
      await get().refreshPendingCount();

      return { success: result.success };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: message };
    }
  },

  finishCheckout: async (photo, location, gpsStatus) => {
    try {
      const result = await syncService.checkout({
        latitude: location?.coords.latitude ?? null,
        longitude: location?.coords.longitude ?? null,
        gpsStatus,
        photoBlob: photo
      });

      if (result.success) {
        set({ activeVisit: null });
        await get().refreshPendingCount();
      }

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      return { success: false, error: message };
    }
  },

  completeTask: async (task, action, details) => {
    const { activeVisit } = get();
    if (!activeVisit) return;

    await syncService.saveTaskCompletion({
      taskId: task.id,
      visitId: activeVisit.serverVisitId || activeVisit.localId,
      localVisitId: activeVisit.localId,
      storeId: task.storeId,
      sku: task.sku,
      action: action as 'na_gondola' | 'ruptura' | 'deposito' | 'preco_ok' | 'preco_divergente',
      priceFound: details.priceFound as number | undefined,
      ruptureReason: details.ruptureReason as 'tem_cd' | 'cd_zerado' | 'sem_pedido' | 'bloqueado' | undefined,
      actionTaken: details.actionTaken as 'pedido' | 'ponto_extra' | 'cartaz' | 'troca_preco' | undefined,
      note: details.note as string | undefined
    });

    await get().refreshPendingCount();
  },

  refreshPendingCount: async () => {
    const pending = await syncService.getPendingCount();
    set({ pendingSync: pending });
  },

  triggerSync: async () => {
    await syncService.syncAll();
    await get().refreshPendingCount();
  }
}));

// Listener para mudanças de conectividade
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useVisitStore.setState({ isOnline: true });
  });
  window.addEventListener('offline', () => {
    useVisitStore.setState({ isOnline: false });
  });
}
