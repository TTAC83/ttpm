import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import PWAUpdateNotification from "@/components/pwa/PWAUpdateNotification";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import MobileInstall from "@/components/pwa/MobileInstall";

// Service worker safety: unregister once to avoid stale bundles
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !sessionStorage.getItem('swCleanupDone')) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    if (regs.length) {
      Promise.all(regs.map((r) => r.unregister())).then(() => {
        sessionStorage.setItem('swCleanupDone', '1');
        location.reload();
      });
    }
  }).catch(() => {/* noop */});
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
