/**
 * Offline POS Queue — IndexedDB-backed queue for sales created while offline.
 * Uses the `idb` library for a clean, typed, Promise-based API.
 * Syncs automatically when network is restored (see useOnlineStatus hook).
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'kampstock-offline';
const DB_VERSION = 1;

interface KampstockDB extends DBSchema {
  'pending-sales': {
    key: number;
    value: PendingSale;
    indexes: { 'by-createdAt': string };
  };
}

export interface PendingSale {
  id?: number;
  payload: unknown;
  createdAt: string;
  retries: number;
}

let _db: IDBPDatabase<KampstockDB> | null = null;

async function getDB(): Promise<IDBPDatabase<KampstockDB>> {
  if (!_db) {
    _db = await openDB<KampstockDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('pending-sales', {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('by-createdAt', 'createdAt');
      },
    });
  }
  return _db;
}

export async function enqueueOfflineSale(payload: unknown): Promise<void> {
  const db = await getDB();
  await db.add('pending-sales', {
    payload,
    createdAt: new Date().toISOString(),
    retries: 0,
  });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await getDB();
  return db.getAll('pending-sales');
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('pending-sales', id);
}

export async function incrementRetry(item: PendingSale): Promise<void> {
  const db = await getDB();
  await db.put('pending-sales', { ...item, retries: item.retries + 1 });
}

/**
 * Attempt to flush all pending sales via the shared axios instance (withCredentials).
 * Returns number of successfully synced items.
 * Max 5 retries per item; permanent client errors (4xx) are discarded immediately.
 */
export async function flushOfflineQueue(): Promise<number> {
  const { default: api } = await import('./api');
  const items = await getPendingSales();
  if (!items.length) return 0;

  let synced = 0;
  for (const item of items) {
    try {
      await api.post('/sales', item.payload);
      await removeFromQueue(item.id!);
      synced++;
    } catch (err: any) {
      const status = err?.response?.status;
      if (item.retries >= 5 || (status && status >= 400 && status < 500)) {
        // Give up: too many retries or a permanent client error (4xx)
        await removeFromQueue(item.id!);
      } else {
        await incrementRetry(item);
      }
    }
  }
  return synced;
}

/** Returns the count of sales waiting to be synced. */
export async function pendingSaleCount(): Promise<number> {
  const db = await getDB();
  return db.count('pending-sales');
}

