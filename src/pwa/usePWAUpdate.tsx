import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export function usePWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() { 
        setNeedRefresh(true);
        // Force activate the new Service Worker and reload to avoid stale chunks
        updateSW(true);
      },
      onOfflineReady() { setOfflineReady(true); setTimeout(()=>setOfflineReady(false), 3000); }
    });
  }, []);
  
  return { needRefresh, offlineReady, reload: () => {
    // Ensure the new SW is applied before reloading
    const updateSW = registerSW({});
    updateSW(true);
  }};
}