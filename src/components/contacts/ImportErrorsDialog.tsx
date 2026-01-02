import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface ImportErrorsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ImportResult | null;
}

export function ImportErrorsDialog({ open, onOpenChange, result }: ImportErrorsDialogProps) {
  if (!result) return null;

  const hasErrors = result.errors.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {hasErrors ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Import {hasErrors ? 'Completed with Errors' : 'Successful'}
          </DialogTitle>
          <DialogDescription>
            {result.success} contact{result.success !== 1 ? 's' : ''} imported successfully
            {result.failed > 0 && `, ${result.failed} failed`}
          </DialogDescription>
        </DialogHeader>

        {hasErrors && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">Errors:</p>
            <ScrollArea className="h-[200px] rounded-md border p-3">
              <ul className="space-y-1 text-sm">
                {result.errors.map((error, index) => (
                  <li key={index} className="text-muted-foreground">
                    • {error}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          </div>
        )}

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
