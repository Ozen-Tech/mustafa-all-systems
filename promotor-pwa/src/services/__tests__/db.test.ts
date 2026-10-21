import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { 
  getDB, 
  generateId, 
  getValue, 
  setValue, 
  deleteValue,
  PendingCheckIn 
} from '../db';

describe('IndexedDB Store', () => {
  beforeEach(async () => {
    // Limpa o banco antes de cada teste
    const db = await getDB();
    const stores = ['pendingCheckIns', 'pendingPhotos', 'activeVisit', 'keyValue'] as const;
    for (const storeName of stores) {
      await db.clear(storeName);
    }
  });

  describe('generateId', () => {
    it('gera IDs únicos', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('keyValue store', () => {
    it('salva e recupera valores', async () => {
      await setValue('test-key', { name: 'teste', value: 123 });
      const result = await getValue<{ name: string; value: number }>('test-key');
      expect(result).toEqual({ name: 'teste', value: 123 });
    });

    it('retorna undefined para chave inexistente', async () => {
      const result = await getValue('nao-existe');
      expect(result).toBeUndefined();
    });

    it('deleta valores', async () => {
      await setValue('to-delete', 'valor');
      await deleteValue('to-delete');
      const result = await getValue('to-delete');
      expect(result).toBeUndefined();
    });
  });

  describe('pendingCheckIns', () => {
    it('salva check-in com todos os campos', async () => {
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
      const result = await db.get('pendingCheckIns', checkIn.id);

      expect(result).toMatchObject({
        storeId: 'store-123',
        storeName: 'Loja Teste',
        gpsStatus: 'ok',
        syncStatus: 'pending',
      });
    });

    it('salva check-in sem GPS', async () => {
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
        gpsStatus: 'timeout',
        photoBlob: null,
        syncStatus: 'pending',
        retryCount: 0,
      };

      await db.put('pendingCheckIns', checkIn);
      const result = await db.get('pendingCheckIns', checkIn.id);

      expect(result?.gpsStatus).toBe('timeout');
      expect(result?.latitude).toBeNull();
      expect(result?.longitude).toBeNull();
    });

    it('busca por status usando índice', async () => {
      const db = await getDB();
      
      const pending: PendingCheckIn = {
        id: generateId(),
        storeId: 'store-1',
        storeName: 'Loja 1',
        storeAddress: 'End 1',
        promoterId: 'p1',
        timestamp: new Date().toISOString(),
        latitude: -23,
        longitude: -46,
        gpsStatus: 'ok',
        photoBlob: null,
        syncStatus: 'pending',
        retryCount: 0,
      };

      const synced: PendingCheckIn = {
        ...pending,
        id: generateId(),
        storeId: 'store-2',
        storeName: 'Loja 2',
        syncStatus: 'synced',
      };

      await db.put('pendingCheckIns', pending);
      await db.put('pendingCheckIns', synced);

      const pendingItems = await db.getAllFromIndex('pendingCheckIns', 'by-status', 'pending');
      expect(pendingItems).toHaveLength(1);
      expect(pendingItems[0].storeId).toBe('store-1');
    });
  });

  describe('offline persistence', () => {
    it('dados persistem após reabrir o banco', async () => {
      const db1 = await getDB();
      
      await setValue('persist-test', { saved: true });
      
      // Simula "fechar" e reabrir o banco
      // (fake-indexeddb mantém os dados entre chamadas)
      const db2 = await getDB();
      
      const result = await getValue<{ saved: boolean }>('persist-test');
      expect(result?.saved).toBe(true);
    });
  });
});
