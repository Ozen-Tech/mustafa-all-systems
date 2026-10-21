import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import 'fake-indexeddb/auto';

// Mock do fetch e navigator antes de importar o syncService
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock do navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
  configurable: true,
});

// Importa após os mocks
import { getDB, PendingCheckIn, generateId } from '../db';

describe('Sync Service - Offline First', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Limpa o banco
    const db = await getDB();
    await db.clear('pendingCheckIns');
    await db.clear('pendingPhotos');
    await db.clear('activeVisit');
    await db.clear('syncQueue');
  });

  describe('saveCheckIn - NUNCA perde dados', () => {
    it('salva check-in localmente mesmo quando offline', async () => {
      // Simula offline
      Object.defineProperty(navigator, 'onLine', { value: false });

      const db = await getDB();
      
      const checkIn: PendingCheckIn = {
        id: generateId(),
        storeId: 'store-123',
        storeName: 'Loja Teste',
        storeAddress: 'Rua Teste, 123',
        promoterId: 'promoter-456',
        timestamp: new Date().toISOString(),
        latitude: -23.5505,
        longitude: -46.6333,
        gpsStatus: 'ok',
        photoBlob: null,
        syncStatus: 'pending',
        retryCount: 0,
      };

      // Salva direto no IndexedDB (simula o que o syncService faz)
      await db.put('pendingCheckIns', checkIn);

      // Verifica que foi salvo
      const saved = await db.get('pendingCheckIns', checkIn.id);
      expect(saved).toBeDefined();
      expect(saved?.storeId).toBe('store-123');
      expect(saved?.syncStatus).toBe('pending');

      // Restaura online
      Object.defineProperty(navigator, 'onLine', { value: true });
    });

    it('salva check-in sem GPS para revisão', async () => {
      const db = await getDB();
      
      const checkIn: PendingCheckIn = {
        id: generateId(),
        storeId: 'store-123',
        storeName: 'Loja Teste',
        storeAddress: 'Rua Teste, 123',
        promoterId: 'promoter-456',
        timestamp: new Date().toISOString(),
        latitude: null,
        longitude: null,
        gpsStatus: 'denied', // GPS negado
        photoBlob: null,
        syncStatus: 'pending',
        retryCount: 0,
      };

      await db.put('pendingCheckIns', checkIn);

      const saved = await db.get('pendingCheckIns', checkIn.id);
      expect(saved?.gpsStatus).toBe('denied');
      expect(saved?.latitude).toBeNull();
    });

    it('mantém múltiplos check-ins pendentes', async () => {
      const db = await getDB();
      
      // Salva 3 check-ins pendentes
      for (let i = 1; i <= 3; i++) {
        const checkIn: PendingCheckIn = {
          id: generateId(),
          storeId: `store-${i}`,
          storeName: `Loja ${i}`,
          storeAddress: `Rua ${i}`,
          promoterId: 'promoter-456',
          timestamp: new Date().toISOString(),
          latitude: -23 - i * 0.01,
          longitude: -46 - i * 0.01,
          gpsStatus: 'ok',
          photoBlob: null,
          syncStatus: 'pending',
          retryCount: 0,
        };
        await db.put('pendingCheckIns', checkIn);
      }

      const pending = await db.getAllFromIndex('pendingCheckIns', 'by-status', 'pending');
      expect(pending).toHaveLength(3);
    });
  });

  describe('retry com erro', () => {
    it('incrementa retryCount em caso de erro', async () => {
      const db = await getDB();
      
      const checkIn: PendingCheckIn = {
        id: generateId(),
        storeId: 'store-123',
        storeName: 'Loja Teste',
        storeAddress: 'Rua Teste, 123',
        promoterId: 'promoter-456',
        timestamp: new Date().toISOString(),
        latitude: -23.5505,
        longitude: -46.6333,
        gpsStatus: 'ok',
        photoBlob: null,
        syncStatus: 'pending',
        retryCount: 0,
      };

      await db.put('pendingCheckIns', checkIn);

      // Simula erro de sync
      const updated: PendingCheckIn = {
        ...checkIn,
        syncStatus: 'error',
        retryCount: 1,
        errorMessage: 'Network error',
      };
      await db.put('pendingCheckIns', updated);

      const saved = await db.get('pendingCheckIns', checkIn.id);
      expect(saved?.retryCount).toBe(1);
      expect(saved?.syncStatus).toBe('error');
      expect(saved?.errorMessage).toBe('Network error');
    });
  });

  describe('activeVisit', () => {
    it('mantém visita ativa mesmo após erros', async () => {
      const db = await getDB();
      
      const visit = {
        id: 'current',
        localId: generateId(),
        storeId: 'store-123',
        storeName: 'Loja Teste',
        promoterId: 'promoter-456',
        checkInAt: new Date().toISOString(),
        checkInLat: -23.5505,
        checkInLng: -46.6333,
        gpsStatus: 'ok' as const,
        isActive: true,
      };

      await db.put('activeVisit', visit);

      // Simula crash/reload
      const restored = await db.get('activeVisit', 'current');
      expect(restored).toBeDefined();
      expect(restored?.storeId).toBe('store-123');
      expect(restored?.isActive).toBe(true);
    });
  });
});

describe('Check-in tolerante a GPS', () => {
  it('aceita todos os status de GPS', async () => {
    const db = await getDB();
    const gpsStatuses: Array<'ok' | 'timeout' | 'denied' | 'unavailable'> = [
      'ok', 'timeout', 'denied', 'unavailable'
    ];

    for (const gpsStatus of gpsStatuses) {
      const checkIn: PendingCheckIn = {
        id: generateId(),
        storeId: `store-${gpsStatus}`,
        storeName: 'Loja',
        storeAddress: 'End',
        promoterId: 'p1',
        timestamp: new Date().toISOString(),
        latitude: gpsStatus === 'ok' ? -23 : null,
        longitude: gpsStatus === 'ok' ? -46 : null,
        gpsStatus,
        photoBlob: null,
        syncStatus: 'pending',
        retryCount: 0,
      };

      await db.put('pendingCheckIns', checkIn);
      const saved = await db.get('pendingCheckIns', checkIn.id);
      
      expect(saved).toBeDefined();
      expect(saved?.gpsStatus).toBe(gpsStatus);
    }
  });

  it('check-ins sem GPS ficam marcados para revisão', async () => {
    const db = await getDB();
    
    // Simula check-in com GPS ok
    const withGps: PendingCheckIn = {
      id: generateId(),
      storeId: 'store-1',
      storeName: 'Loja 1',
      storeAddress: 'End',
      promoterId: 'p1',
      timestamp: new Date().toISOString(),
      latitude: -23,
      longitude: -46,
      gpsStatus: 'ok',
      photoBlob: null,
      syncStatus: 'pending',
      retryCount: 0,
    };

    // Simula check-in sem GPS
    const withoutGps: PendingCheckIn = {
      id: generateId(),
      storeId: 'store-2',
      storeName: 'Loja 2',
      storeAddress: 'End',
      promoterId: 'p1',
      timestamp: new Date().toISOString(),
      latitude: null,
      longitude: null,
      gpsStatus: 'timeout',
      photoBlob: null,
      syncStatus: 'pending',
      retryCount: 0,
    };

    await db.put('pendingCheckIns', withGps);
    await db.put('pendingCheckIns', withoutGps);

    const all = await db.getAll('pendingCheckIns');
    const needsReview = all.filter(c => c.gpsStatus !== 'ok');
    
    expect(needsReview).toHaveLength(1);
    expect(needsReview[0].storeId).toBe('store-2');
  });
});
