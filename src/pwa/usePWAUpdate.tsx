import { useEffect, useState, useCallback } from "react";

export function usePWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    // Dynamic import for PWA register - works in production builds
    import('virtual:pwa-register')
      .then(({ registerSW }) => {
        const sw = registerSW({
          immediate: true,
          onNeedRefresh() {
            console.log('[PWA] New version available');
            setNeedRefresh(true);
          },
          onOfflineReady() {
            console.log('[PWA] Ready for offline use');
            setOfflineReady(true);
            setTimeout(() => setOfflineReady(false), 3000);
          },
          onRegistered(registration) {
            console.log('[PWA] Service worker registered');
            // Check for updates every 60 seconds
            if (registration) {
              setInterval(() => {
                registration.update();
              }, 60 * 1000);
            }
          },
          onRegisterError(error) {
            console.error('[PWA] Registration error:', error);
          }
        });
        setUpdateSW(() => sw);
      })
      .catch((err) => {
        // PWA not available in development
        console.log('[PWA] Not available:', err?.message || err);
      });
  }, []);

  const reload = useCallback(() => {
    if (updateSW) {
      // Apply the update and reload
      updateSW(true);
      return;
    }
    // Fallback: clear caches and reload
    if (typeof caches !== 'undefined') {
      caches.keys().then(names => {
        Promise.all(names.map(name => caches.delete(name))).then(() => {
          location.reload();
        });
      });
    } else {
      location.reload();
    }
  }, [updateSW]);

  return { needRefresh, offlineReady, reload };
}