import { usePWAUpdatePrompt } from "@/pwa/usePWAUpdate";
import { RefreshCw } from "lucide-react";

export default function PWAUpdateNotification() {
  const { needRefresh, offlineReady, reload } = usePWAUpdatePrompt();
  
  return (
    <div style={{ position:"fixed", bottom:16, left:16, zIndex:9999, display: "flex", flexDirection: "column", gap: 8 }}>
      {offlineReady && (
        <div style={{ 
          background:"#111827", 
          color:"#e5e7eb", 
          padding:"10px 14px", 
          borderRadius:8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          fontSize: 14
        }}>
          ✓ Ready to work offline
        </div>
      )}
      {needRefresh && (
        <button 
          onClick={reload} 
          style={{ 
            background: "linear-gradient(135deg, #0ea5e9, #0284c7)",
            color:"#fff", 
            padding:"12px 16px", 
            borderRadius:8,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 500,
            fontSize: 14,
            boxShadow: "0 4px 12px rgba(14, 165, 233, 0.4)",
            animation: "pulse 2s infinite"
          }}
        >
          <RefreshCw size={16} />
          Update available — Click to reload
        </button>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}