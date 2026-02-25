import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface BulkAddLinesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (names: string[]) => Promise<void>;
}

export const BulkAddLinesDialog: React.FC<BulkAddLinesDialogProps> = ({
  open,
  onOpenChange,
  onAdd,
}) => {
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  const names = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const handleAdd = async () => {
    if (names.length === 0) return;
    setSaving(true);
    try {
      await onAdd(names);
      setText("");
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Add Lines</DialogTitle>
          <DialogDescription>
            Enter one line name per row. Skeleton lines will be created instantly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="bulk-names">Line Names</Label>
          <Textarea
            id="bulk-names"
            placeholder={"Packing Line A\nPacking Line B\nLabelling Line"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            {names.length} line{names.length !== 1 ? "s" : ""} will be created
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={names.length === 0 || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add {names.length} Line{names.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
