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
 * Attempt to flush all pending sales via fetch POST /api/sales.
 * Returns number of successfully synced items.
 */
export async function flushOfflineQueue(accessToken: string): Promise<number> {
  const items = await getPendingSales();
  if (!items.length) return 0;

  let synced = 0;
  for (const item of items) {
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(item.payload),
      });
      if (res.ok) {
        await removeFromQueue(item.id!);
        synced++;
      } else if (item.retries >= 5) {
        // Give up after 5 retries — move to dead letter (just remove to avoid infinite loop)
        await removeFromQueue(item.id!);
      } else {
        await incrementRetry(item);
      }
    } catch {
      // Network still unavailable — leave in queue
      if (item.retries >= 5) {
        await removeFromQueue(item.id!);
      } else {
        await incrementRetry(item);
      }
    }
  }
  return synced;
}
