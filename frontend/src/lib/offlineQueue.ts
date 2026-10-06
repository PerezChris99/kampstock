/**
 * Offline POS Queue — IndexedDB-backed queue for sales created while offline.
 * Uses the `idb` library for a clean, typed, Promise-based API.
 * Syncs automatically when network is restored (see useOnlineStatus hook).
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'kampstock-offline';
const DB_VERSION = 2;

interface KampstockDB extends DBSchema {
  'pending-sales': {
    key: number;
    value: PendingSale;
    indexes: { 'by-createdAt': string };
  };
  'failed-sales': {
    key: number;
    value: FailedSale;
    indexes: { 'by-failedAt': string };
  };
}

export interface PendingSale {
  id?: number;
  payload: unknown;
  createdAt: string;
  retries: number;
}

export interface FailedSale {
  id?: number;
  payload: unknown;
  createdAt: string;
  failedAt: string;
  reason: string;
}

let _db: IDBPDatabase<KampstockDB> | null = null;

async function getDB(): Promise<IDBPDatabase<KampstockDB>> {
  if (!_db) {
    _db = await openDB<KampstockDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore('pending-sales', {
            keyPath: 'id',
            autoIncrement: true,
          });
          store.createIndex('by-createdAt', 'createdAt');
        }
        if (oldVersion < 2) {
          const failedStore = db.createObjectStore('failed-sales', {
            keyPath: 'id',
            autoIncrement: true,
          });
          failedStore.createIndex('by-failedAt', 'failedAt');
        }
      },
    });
  }
  return _db;
}

export async function enqueueOfflineSale(payload: unknown): Promise<void> {
  const db = await getDB();
  const clientReference = globalThis.crypto.randomUUID();
  const queuedPayload = payload && typeof payload === 'object'
    ? { ...(payload as Record<string, unknown>), clientReference }
    : payload;
  await db.add('pending-sales', {
    payload: queuedPayload,
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

async function moveToFailed(item: PendingSale, reason: string): Promise<void> {
  const db = await getDB();
  await db.add('failed-sales', {
    payload: item.payload,
    createdAt: item.createdAt,
    failedAt: new Date().toISOString(),
    reason,
  });
  await db.delete('pending-sales', item.id!);
}

export async function getFailedSales(): Promise<FailedSale[]> {
  const db = await getDB();
  return db.getAll('failed-sales');
}

export async function clearFailedSale(id: number): Promise<void> {
  const db = await getDB();
  await db.delete('failed-sales', id);
}

export async function failedSaleCount(): Promise<number> {
  const db = await getDB();
  return db.count('failed-sales');
}

/**
 * Attempt to flush all pending sales via the shared axios instance (withCredentials).
 * Returns number of successfully synced items.
 * Max 5 retries per item; permanent client errors (4xx) are moved to 'failed-sales'
 * instead of silently discarded — the UI is expected to surface these to the user.
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
      const status = err?.response?.status as number | undefined;
      if (item.retries >= 5) {
        await moveToFailed(item, `Max retries exceeded (last status: ${status ?? 'network'})`);
      } else if (status && status >= 400 && status < 500) {
        // Permanent client error — move to failed store for manager review
        const serverMsg: string =
          err?.response?.data?.message ?? `HTTP ${status}`;
        await moveToFailed(item, serverMsg);
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

