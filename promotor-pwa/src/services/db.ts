/**
 * IndexedDB Store - Armazenamento persistente offline-first
 * 
 * PROBLEMA RESOLVIDO:
 * O app antigo usava AsyncStorage (localStorage no PWA) que:
 * 1. Tem limite de ~5MB (fotos comprimidas estouram)
 * 2. É síncrono no web (trava a UI)
 * 3. Perde dados quando o Chrome mata a aba por memória (Galaxy A16)
 * 
 * SOLUÇÃO:
 * IndexedDB oferece:
 * - Gigabytes de armazenamento
 * - API assíncrona
 * - Transações ACID (dados nunca corrompem)
 * - Persistência mesmo se a aba for morta
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

export interface PendingCheckIn {
  id: string;
  storeId: string;
  storeName: string;
  storeAddress: string;
  promoterId: string;
  timestamp: string;
  latitude: number | null;
  longitude: number | null;
  gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable';
  photoBlob: Blob | null;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
  retryCount: number;
  serverVisitId?: string;
}

export interface PendingPhoto {
  id: string;
  visitId: string;
  localVisitId: string;
  blob: Blob;
  type: 'FACADE_CHECKIN' | 'FACADE_CHECKOUT' | 'OTHER';
  industryId?: string;
  latitude?: number;
  longitude?: number;
  timestamp: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  errorMessage?: string;
  retryCount: number;
  serverPhotoUrl?: string;
}

export interface TaskCompletion {
  id: string;
  taskId: string;
  visitId: string;
  localVisitId: string;
  storeId: string;
  sku: string;
  action: 'na_gondola' | 'ruptura' | 'deposito' | 'preco_ok' | 'preco_divergente';
  priceFound?: number;
  ruptureReason?: 'tem_cd' | 'cd_zerado' | 'sem_pedido' | 'bloqueado';
  actionTaken?: 'pedido' | 'ponto_extra' | 'cartaz' | 'troca_preco';
  note?: string;
  timestamp: string;
  syncStatus: 'pending' | 'synced' | 'error';
  errorMessage?: string;
  retryCount: number;
}

export interface MissionCompletion {
  id: string;
  missionId: string;
  storeId: string;
  promoterId: string;
  done: boolean;
  photoBlob?: Blob;
  note?: string;
  timestamp: string;
  syncStatus: 'pending' | 'synced' | 'error';
  retryCount: number;
}

export interface CachedStore {
  id: string;
  name: string;
  code?: string;
  filialCode?: string;
  address: string;
  latitude: number;
  longitude: number;
  state?: string;
  hasCoordinates: boolean;
  cachedAt: string;
}

export interface CachedTask {
  id: string;
  storeId: string;
  sku: string;
  productName: string;
  industryName: string;
  industryId?: string;
  alertType: 'ruptura_com_cd' | 'cd_zerado' | 'parado_30d' | 'negativo' | 'excesso_dde90' | 'cobertura_baixa';
  stockLoja: number;
  stockCD: number;
  lastSale?: string;
  dde?: number;
  priority: number;
  date: string;
  cachedAt: string;
}

export interface CachedMission {
  id: string;
  title: string;
  description?: string;
  industryId?: string;
  industryName?: string;
  storeId?: string;
  weekStart: string;
  weekEnd: string;
  requiresPhoto: boolean;
  cachedAt: string;
}

export interface ActiveVisit {
  id: string;
  localId: string;
  storeId: string;
  storeName: string;
  promoterId: string;
  checkInAt: string;
  checkInLat?: number;
  checkInLng?: number;
  gpsStatus: 'ok' | 'timeout' | 'denied' | 'unavailable';
  serverVisitId?: string;
  isActive: boolean;
}

export interface SyncQueueItem {
  id: string;
  type: 'checkin' | 'photo' | 'checkout' | 'task' | 'mission';
  referenceId: string;
  priority: number;
  createdAt: string;
  attempts: number;
  lastAttempt?: string;
  nextAttempt?: string;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  errorMessage?: string;
}

interface PromotorDB extends DBSchema {
  pendingCheckIns: {
    key: string;
    value: PendingCheckIn;
    indexes: {
      'by-store': string;
      'by-status': string;
      'by-timestamp': string;
    };
  };
  pendingPhotos: {
    key: string;
    value: PendingPhoto;
    indexes: {
      'by-visit': string;
      'by-local-visit': string;
      'by-status': string;
    };
  };
  taskCompletions: {
    key: string;
    value: TaskCompletion;
    indexes: {
      'by-visit': string;
      'by-store': string;
      'by-status': string;
    };
  };
  missionCompletions: {
    key: string;
    value: MissionCompletion;
    indexes: {
      'by-mission': string;
      'by-store': string;
      'by-status': string;
    };
  };
  cachedStores: {
    key: string;
    value: CachedStore;
    indexes: {
      'by-code': string;
    };
  };
  cachedTasks: {
    key: string;
    value: CachedTask;
    indexes: {
      'by-store': string;
      'by-date': string;
    };
  };
  cachedMissions: {
    key: string;
    value: CachedMission;
    indexes: {
      'by-week': string;
      'by-store': string;
    };
  };
  activeVisit: {
    key: string;
    value: ActiveVisit;
  };
  syncQueue: {
    key: string;
    value: SyncQueueItem;
    indexes: {
      'by-status': string;
      'by-priority': number;
      'by-next-attempt': string;
    };
  };
  keyValue: {
    key: string;
    value: { key: string; value: unknown; updatedAt: string };
  };
}

const DB_NAME = 'promotor-mustafa-v2';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<PromotorDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<PromotorDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<PromotorDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const checkInStore = db.createObjectStore('pendingCheckIns', { keyPath: 'id' });
        checkInStore.createIndex('by-store', 'storeId');
        checkInStore.createIndex('by-status', 'syncStatus');
        checkInStore.createIndex('by-timestamp', 'timestamp');

        const photoStore = db.createObjectStore('pendingPhotos', { keyPath: 'id' });
        photoStore.createIndex('by-visit', 'visitId');
        photoStore.createIndex('by-local-visit', 'localVisitId');
        photoStore.createIndex('by-status', 'syncStatus');

        const taskStore = db.createObjectStore('taskCompletions', { keyPath: 'id' });
        taskStore.createIndex('by-visit', 'visitId');
        taskStore.createIndex('by-store', 'storeId');
        taskStore.createIndex('by-status', 'syncStatus');

        const missionStore = db.createObjectStore('missionCompletions', { keyPath: 'id' });
        missionStore.createIndex('by-mission', 'missionId');
        missionStore.createIndex('by-store', 'storeId');
        missionStore.createIndex('by-status', 'syncStatus');

        const storeCache = db.createObjectStore('cachedStores', { keyPath: 'id' });
        storeCache.createIndex('by-code', 'code');

        const taskCache = db.createObjectStore('cachedTasks', { keyPath: 'id' });
        taskCache.createIndex('by-store', 'storeId');
        taskCache.createIndex('by-date', 'date');

        const missionCache = db.createObjectStore('cachedMissions', { keyPath: 'id' });
        missionCache.createIndex('by-week', 'weekStart');
        missionCache.createIndex('by-store', 'storeId');

        db.createObjectStore('activeVisit', { keyPath: 'id' });

        const syncQueue = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncQueue.createIndex('by-status', 'status');
        syncQueue.createIndex('by-priority', 'priority');
        syncQueue.createIndex('by-next-attempt', 'nextAttempt');

        db.createObjectStore('keyValue', { keyPath: 'key' });
      }
    },
    blocked() {
      console.warn('[DB] Database blocked - close other tabs');
    },
    blocking() {
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      dbInstance = null;
    }
  });

  return dbInstance;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function getValue<T>(key: string): Promise<T | undefined> {
  const db = await getDB();
  const result = await db.get('keyValue', key);
  return result?.value as T | undefined;
}

export async function setValue<T>(key: string, value: T): Promise<void> {
  const db = await getDB();
  await db.put('keyValue', { key, value, updatedAt: new Date().toISOString() });
}

export async function deleteValue(key: string): Promise<void> {
  const db = await getDB();
  await db.delete('keyValue', key);
}
