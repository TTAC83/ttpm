import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Smartphone, Share, Plus } from "lucide-react";
import { useAndroidInstallPrompt } from "@/pwa/useAndroidInstall";
import { useToast } from "@/hooks/use-toast";
function useDeviceDetection() {
  const [device, setDevice] = useState<'android' | 'ios' | 'desktop'>('desktop');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    
    console.log('MobileInstall: userAgent:', userAgent);
    console.log('MobileInstall: isMobileDevice:', isMobileDevice);
    
    setIsMobile(isMobileDevice);
    
    if (/android/i.test(userAgent)) {
      setDevice('android');
      console.log('MobileInstall: Detected Android device');
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
      setDevice('ios');
      console.log('MobileInstall: Detected iOS device');
    } else {
      setDevice('desktop');
      console.log('MobileInstall: Detected desktop device');
    }
  }, []);

  return { device, isMobile };
}

function AndroidInstallInstructions() {
  const { supported, promptInstall, hasNativePrompt } = useAndroidInstallPrompt();
  const { toast } = useToast();
  const [showManual, setShowManual] = useState(false);

  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener");
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Smartphone className="w-5 h-5" />
          Install TTPM App
        </CardTitle>
        <CardDescription>
          Get the full app experience with offline access and push notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {supported ? (
          <div className="space-y-3">
            <Badge variant="secondary" className="w-full justify-center">
              {hasNativePrompt ? "Installation Available" : "Ready to Install"}
            </Badge>
            <Button 
              onClick={async () => {
                console.log('MobileInstall: Install button clicked');
                const result = await promptInstall();
                console.log('MobileInstall: Install result:', result);
                const outcome = (result as any)?.outcome;
                if (!outcome || outcome === "manual") {
                  setShowManual(true);
                  toast({ title: "Install manually", description: "Use the browser menu > Add to Home screen." });
                  return;
                }
                if (outcome === "accepted") {
                  toast({ title: "Installing…", description: "Follow the system prompt to add the app." });
                } else if (outcome === "dismissed") {
                  toast({ title: "Install dismissed", description: "You can try again from the browser menu." });
                  setShowManual(true);
                }
              }} 
              className="w-full" 
              size="lg"
            >
              <Download className="w-4 h-4 mr-2" />
              {hasNativePrompt ? "Install App Now" : "Install App"}
            </Button>

            {(!hasNativePrompt || showManual) && (
              <>
                <Button
                  onClick={openInNewTab}
                  variant="outline"
                  className="w-full"
                  size="sm"
                >
                  Open in new tab
                </Button>
                <div className="text-sm space-y-2 mt-3">
                  <p className="font-medium text-center">Manual Installation:</p>
                  <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                    <li>Tap the menu button (⋮) in your browser</li>
                    <li>Look for "Add to Home screen" or "Install app"</li>
                    <li>Confirm the installation</li>
                    <li>Find the TTPM app icon on your home screen</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <Badge variant="outline" className="w-full justify-center">
              Manual Installation
            </Badge>
            <div className="text-sm space-y-2">
              <p className="font-medium">To install TTPM:</p>
              <ol className="list-decimal pl-4 space-y-1 text-muted-foreground">
                <li>Tap the menu button (⋮) in your browser</li>
                <li>Select "Add to Home screen" or "Install app"</li>
                <li>Confirm the installation</li>
                <li>Find the TTPM app icon on your home screen</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IOSInstallInstructions() {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center gap-2 justify-center">
          <Smartphone className="w-5 h-5" />
          Install TTPM App
        </CardTitle>
        <CardDescription>
          Add TTPM to your home screen for the best experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Badge variant="secondary" className="w-full justify-center">
          Safari Required
        </Badge>
        <div className="text-sm space-y-3">
          <p className="font-medium">To install TTPM on iOS:</p>
          <ol className="list-decimal pl-4 space-y-2 text-muted-foreground">
            <li>
              <span className="font-medium">Open in Safari</span>
              <br />
              <span className="text-xs">This feature only works in Safari browser</span>
            </li>
            <li>
              <span className="font-medium">Tap the Share button</span>
              <br />
              <div className="flex items-center gap-1 mt-1">
                <Share className="w-3 h-3" />
                <span className="text-xs">(Square with arrow pointing up)</span>
              </div>
            </li>
            <li>
              <span className="font-medium">Select "Add to Home Screen"</span>
              <br />
              <div className="flex items-center gap-1 mt-1">
                <Plus className="w-3 h-3" />
                <span className="text-xs">Look for the plus icon</span>
              </div>
            </li>
            <li>
              <span className="font-medium">Tap "Add"</span>
              <br />
              <span className="text-xs">TTPM will appear on your home screen</span>
            </li>
          </ol>
        </div>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Once installed, TTPM will work offline and you'll receive push notifications for important updates.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function MobileInstall() {
  const { device, isMobile } = useDeviceDetection();
  const [showDialog, setShowDialog] = useState(false);

  // Auto-show on mobile devices after a short delay
  useEffect(() => {
    console.log('MobileInstall: isMobile:', isMobile, 'device:', device);
    
    if (isMobile && !localStorage.getItem('ttpm-install-prompt-shown')) {
      console.log('MobileInstall: Will show install dialog after 3 seconds');
      const timer = setTimeout(() => {
        console.log('MobileInstall: Showing install dialog');
        setShowDialog(true);
        localStorage.setItem('ttpm-install-prompt-shown', 'true');
      }, 3000); // Show after 3 seconds

      return () => clearTimeout(timer);
    }
  }, [isMobile]);

  console.log('MobileInstall: Rendering - isMobile:', isMobile, 'device:', device);
  
  if (!isMobile) return null;

  return (
    <>
      {/* Floating install button for mobile */}
      <div className="fixed bottom-4 right-4 z-50 lg:hidden">
        <Button
          onClick={() => setShowDialog(true)}
          size="sm"
          className="rounded-full shadow-lg"
        >
          <Download className="w-4 h-4 mr-2" />
          Install
        </Button>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm mx-4">
          <DialogHeader>
            <DialogTitle className="sr-only">Install TTPM App</DialogTitle>
          </DialogHeader>
          {device === 'android' && <AndroidInstallInstructions />}
          {device === 'ios' && <IOSInstallInstructions />}
        </DialogContent>
      </Dialog>
    </>
  );
}