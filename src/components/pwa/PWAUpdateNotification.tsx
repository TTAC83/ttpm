import { usePWAUpdatePrompt } from "@/pwa/usePWAUpdate";

export default function PWAUpdateNotification() {
  const { needRefresh, offlineReady, reload } = usePWAUpdatePrompt();
  
  return (
    <div style={{ position:"fixed", bottom:16, left:16, zIndex:9999 }}>
      {offlineReady && (
        <div style={{ 
          background:"#111827", 
          color:"#e5e7eb", 
          padding:"8px 12px", 
          borderRadius:8, 
          marginBottom:8 
        }}>
          Ready to work offline
        </div>
      )}
      {needRefresh && (
        <button 
          onClick={reload} 
          style={{ 
            background:"#0ea5e9", 
            color:"#fff", 
            padding:"8px 12px", 
            borderRadius:8,
            border: "none",
            cursor: "pointer"
          }}
        >
          Update available — Reload
        </button>
      )}
    </div>
  );
}