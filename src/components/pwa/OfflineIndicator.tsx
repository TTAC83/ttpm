import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Loader2 } from 'lucide-react';

const PENDING_DB_NAME = 'line-media-pending';
const PENDING_STORE = 'queue';

async function getPendingCount(): Promise<number> {
  try {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(PENDING_DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(PENDING_STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(PENDING_STORE, 'readonly');
    const count = await new Promise<number>((resolve) => {
      const req = tx.objectStore(PENDING_STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    db.close();
    return count;
  } catch {
    return 0;
  }
}

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshPending = useCallback(async () => {
    const count = await getPendingCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncing(true);
      // Give background sync time to process, then refresh
      setTimeout(() => {
        refreshPending().then(() => setSyncing(false));
      }, 3000);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Poll pending count while offline
    const interval = setInterval(refreshPending, 5000);
    refreshPending();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPending]);

  if (isOnline && !syncing && pendingCount === 0) return null;

  return (
    <Badge variant="destructive" className="fixed top-4 right-4 z-50 gap-1.5">
      {syncing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {syncing
        ? 'Syncing…'
        : pendingCount > 0
          ? `Offline · ${pendingCount} pending`
          : 'Offline Mode'}
    </Badge>
  );
}
