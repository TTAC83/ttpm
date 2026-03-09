import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { WifiOff, Loader2, CheckCircle2 } from 'lucide-react';
import { getQueueCount } from '@/lib/offlineQueue';
import { toast } from 'sonner';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueCount, setQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ success: number; failed: number } | null>(null);

  const refreshCount = useCallback(async () => {
    const count = await getQueueCount();
    setQueueCount(count);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setSyncResult(null);
    };
    const handleQueueChange = () => refreshCount();
    const handleSyncStart = () => {
      setSyncing(true);
      setSyncResult(null);
    };
    const handleSyncComplete = (e: Event) => {
      const detail = (e as CustomEvent).detail as { success: number; failed: number };
      setSyncing(false);
      setSyncResult(detail);
      refreshCount();
      
      if (detail.success > 0) {
        toast.success(`${detail.success} offline change${detail.success > 1 ? 's' : ''} synced successfully`);
      }
      if (detail.failed > 0) {
        toast.error(`${detail.failed} change${detail.failed > 1 ? 's' : ''} failed to sync`);
      }

      // Clear sync result after 5s
      setTimeout(() => setSyncResult(null), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-change', handleQueueChange);
    window.addEventListener('offline-sync-start', handleSyncStart);
    window.addEventListener('offline-sync-complete', handleSyncComplete);

    // Poll queue count periodically
    const interval = setInterval(refreshCount, 5000);
    refreshCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-change', handleQueueChange);
      window.removeEventListener('offline-sync-start', handleSyncStart);
      window.removeEventListener('offline-sync-complete', handleSyncComplete);
      clearInterval(interval);
    };
  }, [refreshCount]);

  // Nothing to show
  if (isOnline && !syncing && !syncResult && queueCount === 0) return null;

  // Sync just completed successfully
  if (isOnline && syncResult && syncResult.success > 0 && syncResult.failed === 0) {
    return (
      <Badge className="fixed top-4 right-4 z-50 gap-1.5 bg-green-600 text-white border-green-700">
        <CheckCircle2 className="h-3 w-3" />
        All changes synced
      </Badge>
    );
  }

  return (
    <Badge variant="destructive" className="fixed top-4 right-4 z-50 gap-1.5">
      {syncing ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      {syncing
        ? `Syncing ${queueCount} change${queueCount !== 1 ? 's' : ''}…`
        : queueCount > 0
          ? `Offline · ${queueCount} pending`
          : 'Offline Mode'}
    </Badge>
  );
}
