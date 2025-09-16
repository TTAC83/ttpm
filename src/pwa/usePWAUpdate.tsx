import { useEffect, useState } from "react";
import { registerSW } from "virtual:pwa-register";

export function usePWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  
  useEffect(() => {
    registerSW({
      onNeedRefresh() { setNeedRefresh(true); },
      onOfflineReady() { setOfflineReady(true); setTimeout(()=>setOfflineReady(false), 3000); }
    });
  }, []);
  
  return { needRefresh, offlineReady, reload: () => location.reload() };
}