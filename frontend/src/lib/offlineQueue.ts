/**
 * Offline POS Queue — IndexedDB-backed queue for sales created while offline.
 * Syncs automatically when network is restored.
 */

const DB_NAME = 'kampstock-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-sales';

export interface PendingSale {
  id?: number;
  payload: unknown;
  createdAt: string;
  retries: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueOfflineSale(payload: unknown): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({
      payload,
      createdAt: new Date().toISOString(),
      retries: 0,
    } as PendingSale);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingSales(): Promise<PendingSale[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result as PendingSale[]);
    req.onerror = () => reject(req.error);
  });
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function incrementRetry(item: PendingSale): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ ...item, retries: item.retries + 1 });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Attempt to flush all pending sales via the shared axios instance (withCredentials).
 * Returns number of successfully synced items.
 */
export async function flushOfflineQueue(): Promise<number> {
  // Dynamically import to avoid circular deps; api instance has withCredentials: true
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
      if (item.retries >= 5 || (status && status < 500)) {
        // Give up: too many retries or a permanent client error
        await removeFromQueue(item.id!);
      } else {
        await incrementRetry(item);
      }
    }
  }
  return synced;
}
