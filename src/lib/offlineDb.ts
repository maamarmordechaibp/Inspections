const DB_NAME = 'dousefire_offline';
const DB_VERSION = 1;

interface OfflineRecord {
  id: string;
  collection: string;
  data: any;
  operation: 'create' | 'update' | 'delete';
  synced: boolean;
  created_at: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_cache')) {
        db.createObjectStore('offline_cache', { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueForSync(collection: string, data: any, operation: 'create' | 'update' | 'delete'): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  const record: OfflineRecord = {
    id: `${collection}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    collection,
    data,
    operation,
    synced: false,
    created_at: Date.now(),
  };
  store.add(record);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

export async function getPendingSyncItems(): Promise<OfflineRecord[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const request = store.getAll();
    request.onsuccess = () => {
      resolve(request.result.filter((r) => !r.synced));
    };
  });
}

export async function markSynced(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('sync_queue', 'readwrite');
  const store = tx.objectStore('sync_queue');
  store.delete(id);
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

export async function getPendingCount(): Promise<number> {
  const items = await getPendingSyncItems();
  return items.length;
}

export async function cacheOfflineData(key: string, data: any): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('offline_cache', 'readwrite');
  const store = tx.objectStore('offline_cache');
  store.put({ key, data, timestamp: Date.now() });
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

export async function getOfflineData(key: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('offline_cache', 'readonly');
    const store = tx.objectStore('offline_cache');
    const request = store.get(key);
    request.onsuccess = () => {
      const result = request.result;
      if (result) {
        // Cache valid for 7 days
        if (Date.now() - result.timestamp < 7 * 86400000) {
          resolve(result.data);
        } else {
          store.delete(key);
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };
    request.onerror = () => resolve(null);
  });
}

export async function clearOfflineCache(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('offline_cache', 'readwrite');
  const store = tx.objectStore('offline_cache');
  store.clear();
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}