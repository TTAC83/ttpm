import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function InstallHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">How to install on Android</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Install on Android</DialogTitle>
        </DialogHeader>
        <ol className="list-decimal pl-5 space-y-2 text-sm">
          <li>Open this site in <b>Chrome</b> or <b>Edge</b> on your Android phone.</li>
          <li>Tap the <b>Install App</b> button (if shown), or open the browser menu <b>⋮</b> and choose <b>Add to Home screen</b> / <b>Install app</b>.</li>
          <li>Confirm the prompt. The app will appear on your home screen.</li>
          <li>Launch <b>Thingtrax</b> from the icon — it opens full screen like a native app.</li>
        </ol>
        <p className="text-xs opacity-70 mt-2">If you don't see the Install button yet, use the browser menu.</p>
      </DialogContent>
    </Dialog>
  );
}