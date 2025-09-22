import { useEffect, useState } from "react";

// Safely import PWA register only if available
let registerSW: any = null;
try {
  registerSW = require("virtual:pwa-register").registerSW;
} catch {
  // PWA not available in this build
}

export function usePWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  
  useEffect(() => {
    if (!registerSW) return; // Skip if PWA not available
    
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
    if (!registerSW) {
      location.reload();
      return;
    }
    // Ensure the new SW is applied before reloading
    const updateSW = registerSW({});
    updateSW(true);
  }};
}