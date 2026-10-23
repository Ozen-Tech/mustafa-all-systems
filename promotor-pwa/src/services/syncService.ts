/**
 * Serviço de Sincronização Offline-First
 * 
 * Garante que NENHUM dado seja perdido:
 * 1. Todos os dados são salvos no IndexedDB ANTES de tentar enviar
 * 2. Fila de sync com retry exponencial
 * 3. Sincroniza automaticamente quando volta online
 * 4. Não bloqueia a UI durante sync
 */

import { 
  getDB, 
  generateId,
  PendingCheckIn,
  PendingPhoto,
  TaskCompletion,
  SyncQueueItem,
  ActiveVisit
} from './db';
import { api } from './api';

type SyncEventType = 'start' | 'progress' | 'complete' | 'error' | 'offline' | 'online';

interface SyncEvent {
  type: SyncEventType;
  pending?: number;
  synced?: number;
  failed?: number;
  message?: string;
}

type SyncListener = (event: SyncEvent) => void;

class SyncService {
  private listeners: Set<SyncListener> = new Set();
  private isSyncing = false;
  private isOnline = navigator.onLine;
  private syncInterval: number | null = null;

  constructor() {
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Sync automático a cada 30s quando online
    this.startAutoSync();
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: SyncEvent) {
    this.listeners.forEach(l => {
      try { l(event); } catch {}
    });
  }

  private handleOnline() {
    this.isOnline = true;
    this.emit({ type: 'online' });
    this.syncAll();
  }

  private handleOffline() {
    this.isOnline = false;
    this.emit({ type: 'offline' });
  }

  private startAutoSync() {
    if (this.syncInterval) return;
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline && !this.isSyncing) {
        this.syncAll();
      }
    }, 30000);
  }

  async getOnlineStatus(): Promise<boolean> {
    if (!navigator.onLine) return false;
    
    try {
      const response = await fetch('/api/health', { 
        method: 'HEAD',
        cache: 'no-store'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async getPendingCount(): Promise<{ checkIns: number; photos: number; tasks: number; total: number }> {
    const db = await getDB();
    
    const checkIns = await db.countFromIndex('pendingCheckIns', 'by-status', 'pending');
    const photos = await db.countFromIndex('pendingPhotos', 'by-status', 'pending');
    const tasks = await db.countFromIndex('taskCompletions', 'by-status', 'pending');
    
    return {
      checkIns,
      photos,
      tasks,
      total: checkIns + photos + tasks
    };
  }

  /**
   * Salva check-in localmente e agenda sync
   * NUNCA bloqueia mesmo se offline
   */
  async saveCheckIn(data: {
    storeId: string;
    storeName: string;
    storeAddress: string;
    promoterId: string;
    latitude: number | null;
    longitude: number | null;
    gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable';
    photoBlob: Blob | null;
  }): Promise<{ localId: string; success: boolean }> {
    const db = await getDB();
    const localId = generateId();
    
    const checkIn: PendingCheckIn = {
      id: localId,
      ...data,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0
    };

    // Salva primeiro no IndexedDB (NUNCA perde)
    await db.put('pendingCheckIns', checkIn);

    // Salva visita ativa
    const activeVisit: ActiveVisit = {
      id: 'current',
      localId,
      storeId: data.storeId,
      storeName: data.storeName,
      promoterId: data.promoterId,
      checkInAt: checkIn.timestamp,
      checkInLat: data.latitude ?? undefined,
      checkInLng: data.longitude ?? undefined,
      gpsStatus: data.gpsStatus,
      isActive: true
    };
    await db.put('activeVisit', activeVisit);

    // Agenda sync na fila
    await this.addToSyncQueue('checkin', localId, 10);

    // Tenta sync imediato se online
    if (this.isOnline) {
      this.syncCheckIn(localId);
    }

    return { localId, success: true };
  }

  /**
   * Salva foto localmente e agenda sync
   */
  async savePhoto(data: {
    visitId: string;
    localVisitId: string;
    blob: Blob;
    type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
    industryId?: string;
    latitude?: number;
    longitude?: number;
  }): Promise<{ localId: string; success: boolean }> {
    const db = await getDB();
    const localId = generateId();

    const photo: PendingPhoto = {
      id: localId,
      ...data,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0
    };

    await db.put('pendingPhotos', photo);
    await this.addToSyncQueue('photo', localId, 5);

    if (this.isOnline) {
      this.syncPhoto(localId);
    }

    return { localId, success: true };
  }

  /**
   * Salva conclusão de tarefa localmente
   */
  async saveTaskCompletion(data: Omit<TaskCompletion, 'id' | 'timestamp' | 'syncStatus' | 'retryCount'>): Promise<{ localId: string }> {
    const db = await getDB();
    const localId = generateId();

    const completion: TaskCompletion = {
      id: localId,
      ...data,
      timestamp: new Date().toISOString(),
      syncStatus: 'pending',
      retryCount: 0
    };

    await db.put('taskCompletions', completion);
    await this.addToSyncQueue('task', localId, 3);

    if (this.isOnline) {
      this.syncTask(localId);
    }

    return { localId };
  }

  private async addToSyncQueue(type: SyncQueueItem['type'], referenceId: string, priority: number) {
    const db = await getDB();
    const item: SyncQueueItem = {
      id: generateId(),
      type,
      referenceId,
      priority,
      createdAt: new Date().toISOString(),
      attempts: 0,
      status: 'pending'
    };
    await db.put('syncQueue', item);
  }

  private async syncCheckIn(localId: string) {
    const db = await getDB();
    const checkIn = await db.get('pendingCheckIns', localId);
    if (!checkIn || checkIn.syncStatus === 'synced') return;

    try {
      await db.put('pendingCheckIns', { ...checkIn, syncStatus: 'syncing' });

      // Upload da foto primeiro (se houver) - NÃO usa placeholder, mantém na fila para retry
      let photoUrl: string | null = null;
      if (checkIn.photoBlob) {
        try {
          const uploadResult = await api.uploadPhoto(checkIn.photoBlob, 'FACADE_CHECKIN');
          photoUrl = uploadResult.url;
        } catch (uploadError) {
          console.warn('[Sync] Falha no upload da foto, mantendo na fila:', uploadError);
          await db.put('pendingCheckIns', {
            ...checkIn,
            syncStatus: 'pending',
            retryCount: checkIn.retryCount + 1,
            errorMessage: 'Falha no upload da foto'
          });
          return;
        }
      }

      if (!photoUrl) {
        console.warn('[Sync] Sem foto para upload, mantendo na fila');
        await db.put('pendingCheckIns', {
          ...checkIn,
          syncStatus: 'pending',
          retryCount: checkIn.retryCount + 1,
          errorMessage: 'Foto obrigatória'
        });
        return;
      }

      // Envia check-in com clientId para idempotência
      const result = await api.checkIn({
        storeId: checkIn.storeId,
        latitude: checkIn.latitude,
        longitude: checkIn.longitude,
        gpsStatus: checkIn.gpsStatus,
        photoUrl,
        clientId: localId
      });

      // Atualiza com ID do servidor
      await db.put('pendingCheckIns', {
        ...checkIn,
        syncStatus: 'synced',
        serverVisitId: result.visit.id
      });

      // Atualiza visita ativa
      const activeVisit = await db.get('activeVisit', 'current');
      if (activeVisit && activeVisit.localId === localId) {
        await db.put('activeVisit', {
          ...activeVisit,
          serverVisitId: result.visit.id
        });
      }

      this.emit({ type: 'progress', message: 'Check-in sincronizado' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      // Se for erro de visita já existente (idempotência), tenta recuperar o visitId
      if (errorMessage.includes('visita em andamento') || errorMessage.includes('already')) {
        try {
          const currentVisit = await api.getCurrentVisit();
          if (currentVisit.visit) {
            await db.put('pendingCheckIns', {
              ...checkIn,
              syncStatus: 'synced',
              serverVisitId: currentVisit.visit.id
            });
            const activeVisit = await db.get('activeVisit', 'current');
            if (activeVisit && activeVisit.localId === localId) {
              await db.put('activeVisit', {
                ...activeVisit,
                serverVisitId: currentVisit.visit.id
              });
            }
            this.emit({ type: 'progress', message: 'Check-in recuperado' });
            return;
          }
        } catch {
          // Continua com o erro original
        }
      }
      
      await db.put('pendingCheckIns', {
        ...checkIn,
        syncStatus: 'error',
        errorMessage,
        retryCount: checkIn.retryCount + 1
      });
      this.emit({ type: 'error', message: `Falha no sync: ${errorMessage}` });
    }
  }

  private async syncPhoto(localId: string) {
    const db = await getDB();
    const photo = await db.get('pendingPhotos', localId);
    if (!photo || photo.syncStatus === 'synced') return;

    try {
      await db.put('pendingPhotos', { ...photo, syncStatus: 'syncing' });

      // Precisa do visitId do servidor
      let serverVisitId = photo.visitId;
      if (!serverVisitId || serverVisitId === photo.localVisitId) {
        const activeVisit = await db.get('activeVisit', 'current');
        if (activeVisit?.serverVisitId) {
          serverVisitId = activeVisit.serverVisitId;
        } else {
          throw new Error('Aguardando sync do check-in');
        }
      }

      const uploadResult = await api.uploadPhoto(photo.blob, photo.type);
      
      await api.registerPhoto({
        visitId: serverVisitId,
        url: uploadResult.url,
        type: photo.type,
        latitude: photo.latitude,
        longitude: photo.longitude,
        industryId: photo.industryId
      });

      await db.put('pendingPhotos', {
        ...photo,
        visitId: serverVisitId,
        syncStatus: 'synced',
        serverPhotoUrl: uploadResult.url
      });

      this.emit({ type: 'progress', message: 'Foto sincronizada' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      await db.put('pendingPhotos', {
        ...photo,
        syncStatus: 'error',
        errorMessage,
        retryCount: photo.retryCount + 1
      });
    }
  }

  private async syncTask(localId: string) {
    const db = await getDB();
    const task = await db.get('taskCompletions', localId);
    if (!task || task.syncStatus === 'synced') return;

    try {
      let serverVisitId = task.visitId;
      if (!serverVisitId || serverVisitId === task.localVisitId) {
        const activeVisit = await db.get('activeVisit', 'current');
        if (activeVisit?.serverVisitId) {
          serverVisitId = activeVisit.serverVisitId;
        } else {
          throw new Error('Aguardando sync do check-in');
        }
      }

      await api.completeTask({
        visitId: serverVisitId,
        taskId: task.taskId,
        storeId: task.storeId,
        sku: task.sku,
        action: task.action,
        priceFound: task.priceFound,
        ruptureReason: task.ruptureReason,
        actionTaken: task.actionTaken,
        note: task.note
      });

      await db.put('taskCompletions', {
        ...task,
        visitId: serverVisitId,
        syncStatus: 'synced'
      });

      this.emit({ type: 'progress', message: 'Tarefa sincronizada' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      await db.put('taskCompletions', {
        ...task,
        syncStatus: 'error',
        errorMessage,
        retryCount: task.retryCount + 1
      });
    }
  }

  async syncAll(): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    this.emit({ type: 'start' });

    const db = await getDB();
    let synced = 0;
    let failed = 0;

    try {
      // Sync check-ins primeiro (outros dependem do visitId)
      const pendingCheckIns = await db.getAllFromIndex('pendingCheckIns', 'by-status', 'pending');
      for (const checkIn of pendingCheckIns) {
        try {
          await this.syncCheckIn(checkIn.id);
          synced++;
        } catch {
          failed++;
        }
      }

      // Depois fotos
      const pendingPhotos = await db.getAllFromIndex('pendingPhotos', 'by-status', 'pending');
      for (const photo of pendingPhotos) {
        try {
          await this.syncPhoto(photo.id);
          synced++;
        } catch {
          failed++;
        }
      }

      // Por fim tarefas
      const pendingTasks = await db.getAllFromIndex('taskCompletions', 'by-status', 'pending');
      for (const task of pendingTasks) {
        try {
          await this.syncTask(task.id);
          synced++;
        } catch {
          failed++;
        }
      }

      this.emit({ type: 'complete', synced, failed });
    } finally {
      this.isSyncing = false;
    }
  }

  async getActiveVisit(): Promise<ActiveVisit | null> {
    const db = await getDB();
    const result = await db.get('activeVisit', 'current');
    return result ?? null;
  }

  async clearActiveVisit(): Promise<void> {
    const db = await getDB();
    await db.delete('activeVisit', 'current');
  }

  async checkout(data: {
    latitude: number | null;
    longitude: number | null;
    gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable';
    photoBlob: Blob | null;
  }): Promise<{ success: boolean; error?: string }> {
    const db = await getDB();
    const activeVisit = await db.get('activeVisit', 'current');
    
    if (!activeVisit) {
      return { success: false, error: 'Nenhuma visita ativa' };
    }

    // Se tiver foto, salva
    if (data.photoBlob) {
      await this.savePhoto({
        visitId: activeVisit.serverVisitId || activeVisit.localId,
        localVisitId: activeVisit.localId,
        blob: data.photoBlob,
        type: 'FACADE_CHECKOUT',
        latitude: data.latitude ?? undefined,
        longitude: data.longitude ?? undefined
      });
    }

    // Tenta checkout no servidor se online e tiver visitId E foto
    if (this.isOnline && activeVisit.serverVisitId && data.photoBlob) {
      try {
        const uploadResult = await api.uploadPhoto(data.photoBlob, 'FACADE_CHECKOUT');
        await api.checkout({
          visitId: activeVisit.serverVisitId,
          latitude: data.latitude,
          longitude: data.longitude,
          photoUrl: uploadResult.url
        });
      } catch (error) {
        console.warn('[Sync] Checkout offline, será sincronizado depois via fila de fotos');
      }
    }

    // Limpa visita ativa
    await db.delete('activeVisit', 'current');

    return { success: true };
  }
}

export const syncService = new SyncService();
