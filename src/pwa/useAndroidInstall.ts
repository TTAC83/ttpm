import { useEffect, useState } from "react";

type BIPEvent = Event & { 
  prompt: () => Promise<void>; 
  userChoice?: Promise<{ outcome: "accepted"|"dismissed" }> 
};

export function useAndroidInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent|null>(null);
  const [supported, setSupported] = useState(false);
  
  useEffect(() => {
    const handler = (e: Event) => { 
      e.preventDefault(); 
      setDeferred(e as BIPEvent); 
      setSupported(true); 
    };
    window.addEventListener("beforeinstallprompt", handler as any);
    return () => window.removeEventListener("beforeinstallprompt", handler as any);
  }, []);
  
  const promptInstall = async () => { 
    if (!deferred) return; 
    await deferred.prompt(); 
    setDeferred(null); 
  };
  
  return { supported, promptInstall };
}