import { useState, useEffect } from "react";
import { useAndroidInstallPrompt } from "@/pwa/useAndroidInstall";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import InstallHelpModal from "./InstallHelpModal";

export default function InstallButton() {
  const { supported, promptInstall, hasNativePrompt } = useAndroidInstallPrompt();
  const [showHelp, setShowHelp] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);
  }, []);

  // Don't show if already installed
  if (isInstalled) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      await promptInstall();
    } else {
      setShowHelp(true);
    }
  };

  return (
    <>
      <Button onClick={handleClick} variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Install App
      </Button>
      <InstallHelpModal open={showHelp} onOpenChange={setShowHelp} />
    </>
  );
}