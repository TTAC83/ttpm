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
    
    // Show install option on Android browsers if not already installed
    if (isAndroid && !isStandalone) {
      console.log('useAndroidInstall: Setting supported to true for Android');
      setSupported(true);
    }
    
    const handler = (e: Event) => { 
      console.log('useAndroidInstall: beforeinstallprompt event fired', e);
      e.preventDefault(); 
      const bip = e as BIPEvent;
      (window as any).__ttpm_deferredBIP = bip;
      setDeferred(bip); 
      setSupported(true); 
    };
    
    window.addEventListener("beforeinstallprompt", handler as any);
    
    // Fallback check for browsers that might not fire the event immediately
    const checkDelay = setTimeout(() => {
      if (isAndroid && !isStandalone && !deferred) {
        console.log('useAndroidInstall: Fallback - setting supported without native prompt');
        setSupported(true);
      }
    }, 2000);
    
    return () => {
      window.removeEventListener("beforeinstallprompt", handler as any);
      clearTimeout(checkDelay);
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
  // Auto-install if opened with #install (e.g., opened from iframe)
  useEffect(() => {
    const wantsInstall = typeof window !== 'undefined' && window.location.hash.includes('install');
    if (!wantsInstall) return;
    console.log('useAndroidInstall: #install detected, waiting for native prompt...');
    let tries = 0;
    const maxTries = 30; // ~15s
    const id = setInterval(async () => {
      tries++;
      if (deferred) {
        clearInterval(id);
        await promptInstall();
      } else if (tries >= maxTries) {
        clearInterval(id);
        console.warn('useAndroidInstall: Native prompt not available after waiting.');
      }
    }, 500);
    return () => clearInterval(id);
  }, [deferred]);
  
  return { supported, promptInstall, hasNativePrompt: !!deferred };
}