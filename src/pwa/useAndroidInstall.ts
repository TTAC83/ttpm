import { useEffect, useState } from "react";

type BIPEvent = Event & { 
  prompt: () => Promise<void>; 
  userChoice?: Promise<{ outcome: "accepted"|"dismissed" }> 
};

export function useAndroidInstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent|null>(null);
  const [supported, setSupported] = useState(false);
  
  useEffect(() => {
    console.log('useAndroidInstall: Setting up install prompt detection');
    const cached = (window as any).__ttpm_deferredBIP as BIPEvent | undefined;
    if (cached) {
      console.log('useAndroidInstall: Found cached beforeinstallprompt');
      setDeferred(cached);
      setSupported(true);
    }
    
    // Check if we're on Android and PWA criteria are met
    const isAndroid = /android/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    const inIframe = (() => { try { return window.self !== window.top; } catch { return true; } })();
    
    console.log('useAndroidInstall: isAndroid:', isAndroid, 'isStandalone:', isStandalone, 'inIframe:', inIframe);
    
    // Show install option only when native prompt is available via event
    
    const handler = (e: Event) => { 
      console.log('useAndroidInstall: beforeinstallprompt event fired', e);
      e.preventDefault(); 
      const bip = e as BIPEvent;
      (window as any).__ttpm_deferredBIP = bip;
      setDeferred(bip); 
      setSupported(true); 
    };
    
    window.addEventListener("beforeinstallprompt", handler as any);
    
    // No fallback timer that fakes support; rely on real beforeinstallprompt
    
    return () => {
      window.removeEventListener("beforeinstallprompt", handler as any);
      // no timer to clear
    };
  }, [deferred]);
  
  useEffect(() => {
    const onInstalled = () => {
      console.log('useAndroidInstall: appinstalled event');
      setDeferred(null);
      setSupported(false);
    };
    window.addEventListener('appinstalled', onInstalled);
    return () => window.removeEventListener('appinstalled', onInstalled);
  }, []);
  
  const promptInstall = async () => { 
    console.log('useAndroidInstall: promptInstall called, deferred:', !!deferred);
    
    if (deferred) {
      try {
        console.log('useAndroidInstall: Calling native prompt');
        await deferred.prompt();
        const result = await deferred.userChoice;
        console.log('useAndroidInstall: Install result:', result);
        setDeferred(null);
        return result;
      } catch (error) {
        console.error('useAndroidInstall: Install prompt failed:', error);
      }
    } else {
      console.log('useAndroidInstall: No native prompt available, returning manual');
      // Fallback for browsers without native prompt
      // Show manual installation instructions
      return { outcome: "manual" };
    }
  };
  // If opened with #install in top-level context, ensure UI is shown
  useEffect(() => {
    const wantsInstall = typeof window !== 'undefined' && window.location.hash.includes('install');
    if (wantsInstall) {
      console.log('useAndroidInstall: #install detected (top-level). Waiting for native prompt.');
      setSupported(true);
    }
  }, []);
  
  return { supported, promptInstall, hasNativePrompt: !!deferred };
}