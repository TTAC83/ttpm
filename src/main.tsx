import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import PWAUpdateNotification from "@/components/pwa/PWAUpdateNotification";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import MobileInstall from "@/components/pwa/MobileInstall";

// Check for service worker updates on page visibility change (when user returns to tab)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => {
        if (reg) {
          reg.update().catch(() => {/* noop */});
        }
      });
    }
  });
}

// Set dark mode by default to match Thingtrax interface
document.documentElement.classList.add('dark');

function Root() {
  return (
    <>
      <App />
      <PWAUpdateNotification />
      <OfflineIndicator />
      <MobileInstall />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
