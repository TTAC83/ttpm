import { useAndroidInstallPrompt } from "@/pwa/useAndroidInstall";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export default function InstallButton() {
  const { supported, promptInstall } = useAndroidInstallPrompt();
  
  if (!supported) return null;
  
  return (
    <Button onClick={promptInstall} variant="outline" size="sm">
      <Download className="w-4 h-4 mr-2" />
      Install App
    </Button>
  );
}