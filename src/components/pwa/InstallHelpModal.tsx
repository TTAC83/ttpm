import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface InstallHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InstallHelpModal({ open, onOpenChange }: InstallHelpModalProps) {
  // Detect platform for appropriate instructions
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);
  const isMac = /macintosh/i.test(navigator.userAgent);
  const isWindows = /windows/i.test(navigator.userAgent);
  const isChrome = /chrome/i.test(navigator.userAgent) && !/edg/i.test(navigator.userAgent);
  const isEdge = /edg/i.test(navigator.userAgent);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Install TTPM App</DialogTitle>
        </DialogHeader>
        
        {isIOS ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">To install on iOS:</p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Make sure you're using <b>Safari</b></li>
              <li>Tap the <b>Share</b> button (square with arrow)</li>
              <li>Scroll down and tap <b>"Add to Home Screen"</b></li>
              <li>Tap <b>Add</b> to confirm</li>
            </ol>
          </div>
        ) : isAndroid ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">To install on Android:</p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
              <li>Open in <b>Chrome</b> or <b>Edge</b></li>
              <li>Tap the browser menu <b>⋮</b></li>
              <li>Select <b>"Add to Home screen"</b> or <b>"Install app"</b></li>
              <li>Confirm the installation</li>
            </ol>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium">To install on {isWindows ? 'Windows' : isMac ? 'Mac' : 'Desktop'}:</p>
            <ol className="list-decimal pl-5 space-y-2 text-sm text-muted-foreground">
              {isChrome && (
                <>
                  <li>Look for the <b>install icon</b> in the address bar (right side)</li>
                  <li>Or click the menu <b>⋮</b> → <b>"Install TTPM..."</b></li>
                </>
              )}
              {isEdge && (
                <>
                  <li>Look for the <b>install icon</b> in the address bar (right side)</li>
                  <li>Or click the menu <b>...</b> → <b>Apps</b> → <b>"Install this site as an app"</b></li>
                </>
              )}
              {!isChrome && !isEdge && (
                <>
                  <li>Use <b>Chrome</b> or <b>Edge</b> for the best experience</li>
                  <li>Look for an install option in the browser menu or address bar</li>
                </>
              )}
              <li>Click <b>Install</b> to confirm</li>
            </ol>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Once installed, the app will open in its own window and work offline.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}