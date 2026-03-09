/**
 * Offline Mutation Queue
 * 
 * Stores failed Supabase mutations in IndexedDB when offline,
 * replays them automatically when connectivity returns.
 */

const DB_NAME = 'thingtrax-offline-queue';
const DB_VERSION = 1;
const STORE_NAME = 'mutations';

export interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  table?: string;
  operation?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function queueMutation(mutation: QueuedMutation): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(mutation);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  
  // Dispatch event so UI can update
  window.dispatchEvent(new CustomEvent('offline-queue-change'));
}

export async function getQueuedMutations(): Promise<QueuedMutation[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const items = await new Promise<QueuedMutation[]>((resolve) => {
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
    db.close();
    return items.sort((a, b) => a.timestamp - b.timestamp);
  } catch {
    return [];
  }
}

export async function getQueueCount(): Promise<number> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const count = await new Promise<number>((resolve) => {
      const req = tx.objectStore(STORE_NAME).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}

async function removeMutation(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await new Promise<void>((resolve) => { tx.oncomplete = () => resolve(); });
  db.close();
}

/**
 * Replay all queued mutations in order.
 * Returns { success: number, failed: number }
 */
export async function replayQueue(): Promise<{ success: number; failed: number }> {
  const mutations = await getQueuedMutations();
  let success = 0;
  let failed = 0;

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.url, {
        method: mutation.method,
        headers: mutation.headers,
        body: mutation.body,
      });

      if (response.ok || response.status === 409) {
        // 409 = conflict, item already exists — treat as success
        await removeMutation(mutation.id);
        success++;
      } else if (response.status === 401 || response.status === 403) {
        // Auth issue — skip but keep in queue for retry after re-auth
        failed++;
        console.warn('[OfflineQueue] Auth error replaying mutation, keeping in queue:', mutation.id);
      } else {
        // Other error — remove to avoid infinite retry
        await removeMutation(mutation.id);
        failed++;
        console.error('[OfflineQueue] Failed to replay mutation:', mutation.id, response.status);
      }
    } catch (err) {
      // Network still down — stop replaying
      console.log('[OfflineQueue] Network still unavailable, stopping replay');
      break;
    }
  }

  window.dispatchEvent(new CustomEvent('offline-queue-change'));
  return { success, failed };
}

/**
 * Extract table name from a Supabase REST URL for display purposes
 */
export function extractTableFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/');
    // /rest/v1/tablename
    const idx = parts.indexOf('v1');
    if (idx >= 0 && parts[idx + 1]) {
      return parts[idx + 1].split('?')[0];
    }
  } catch { /* ignore */ }
  return 'unknown';
}

/**
 * Initialize the online listener for automatic replay
 */
let replayInProgress = false;

export function initOfflineSync(): void {
  window.addEventListener('online', async () => {
    if (replayInProgress) return;
    replayInProgress = true;
    
    // Wait a moment for connection to stabilize
    await new Promise(r => setTimeout(r, 2000));
    
    const count = await getQueueCount();
    if (count > 0) {
      console.log(`[OfflineQueue] Back online — replaying ${count} queued mutations`);
      window.dispatchEvent(new CustomEvent('offline-sync-start'));
      
      const result = await replayQueue();
      console.log(`[OfflineQueue] Replay complete: ${result.success} ok, ${result.failed} failed`);
      
      window.dispatchEvent(new CustomEvent('offline-sync-complete', { detail: result }));
    }
    
    replayInProgress = false;
  });
}
