import { useEffect, useState } from "react";

type BIPEvent = Event & { 
  prompt: () => Promise<void>; 
  userChoice?: Promise<{ outcome: "accepted"|"dismissed" }> 
};

export function useAndroidInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent|null>(null);
  const [supported, setSupported] = useState(false);
  
  useEffect(() => {
    // Check if we're on Android and PWA criteria are met
    const isAndroid = /android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    // Show install option on Android browsers if not already installed
    if (isAndroid && !isStandalone) {
      setSupported(true);
    }
    
    const handler = (e: Event) => { 
      e.preventDefault(); 
      setDeferred(e as BIPEvent); 
      setSupported(true); 
    };
    
    window.addEventListener("beforeinstallprompt", handler as any);
    
    // Fallback check for browsers that might not fire the event immediately
    const checkDelay = setTimeout(() => {
      if (isAndroid && !isStandalone && !deferred) {
        setSupported(true);
      }
    }, 2000);
    
    return () => {
      window.removeEventListener("beforeinstallprompt", handler as any);
      clearTimeout(checkDelay);
    };
  }, [deferred]);
  
  const promptInstall = async () => { 
    if (deferred) {
      try {
        await deferred.prompt();
        const result = await deferred.userChoice;
        setDeferred(null);
        return result;
      } catch (error) {
        console.error('Install prompt failed:', error);
      }
    } else {
      // Fallback for browsers without native prompt
      // Show manual installation instructions
      return { outcome: "manual" };
    }
  };
  
  return { supported, promptInstall, hasNativePrompt: !!deferred };
}