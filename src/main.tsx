import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import PWAUpdateNotification from "@/components/pwa/PWAUpdateNotification";
import OfflineIndicator from "@/components/pwa/OfflineIndicator";
import MobileInstall from "@/components/pwa/MobileInstall";

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
