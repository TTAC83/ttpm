import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface ReceiverItem {
  id: string;
  name: string | null;
  manufacturer: string;
  model: string;
}

interface AssignReceiversDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedReceivers: ReceiverItem[];
  onAssign: (receiverIds: string[]) => void;
  isPending: boolean;
  targetName: string;
}

export function AssignReceiversDialog({
  open,
  onOpenChange,
  unassignedReceivers,
  onAssign,
  isPending,
  targetName,
}: AssignReceiversDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === unassignedReceivers.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unassignedReceivers.map(r => r.id)));
    }
  };

  const handleAssign = () => {
    onAssign(Array.from(selected));
    setSelected(new Set());
  };

  const handleOpenChange = (val: boolean) => {
    if (!val) setSelected(new Set());
    onOpenChange(val);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Receivers to {targetName}</DialogTitle>
          <DialogDescription>
            Select receivers to assign to this gateway. Only unassigned receivers are shown.
          </DialogDescription>
        </DialogHeader>

        {unassignedReceivers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">All receivers have been assigned to gateways.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === unassignedReceivers.length && unassignedReceivers.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unassignedReceivers.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(rec.id)}
                      onCheckedChange={() => toggleOne(rec.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{rec.name || '—'}</TableCell>
                  <TableCell>{rec.manufacturer}</TableCell>
                  <TableCell>{rec.model}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || isPending}>
            {isPending ? 'Assigning...' : `Assign ${selected.size} Receiver${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
