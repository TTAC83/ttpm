import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface IoTDeviceWithContext {
  id: string;
  name: string;
  mac_address: string;
  equipment_name: string;
  line_name: string;
  position_name: string;
  hardware_model: string | null;
}

interface AssignDevicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedDevices: IoTDeviceWithContext[];
  onAssign: (deviceIds: string[]) => void;
  isPending: boolean;
  targetName: string;
}

export function AssignDevicesDialog({
  open,
  onOpenChange,
  unassignedDevices,
  onAssign,
  isPending,
  targetName,
}: AssignDevicesDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === unassignedDevices.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unassignedDevices.map(d => d.id)));
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
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign IoT Devices to {targetName}</DialogTitle>
          <DialogDescription>
            Select devices to assign to this receiver. Only unassigned devices are shown.
          </DialogDescription>
        </DialogHeader>

        {unassignedDevices.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">All IoT devices have been assigned to receivers.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === unassignedDevices.length && unassignedDevices.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Device Name</TableHead>
                <TableHead>MAC Address</TableHead>
                <TableHead>Hardware Model</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unassignedDevices.map(dev => (
                <TableRow key={dev.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(dev.id)}
                      onCheckedChange={() => toggleOne(dev.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{dev.line_name}</TableCell>
                  <TableCell>{dev.position_name}</TableCell>
                  <TableCell>{dev.equipment_name}</TableCell>
                  <TableCell>{dev.name}</TableCell>
                  <TableCell className="font-mono text-xs">{dev.mac_address || '—'}</TableCell>
                  <TableCell>{dev.hardware_model || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || isPending}>
            {isPending ? 'Assigning...' : `Assign ${selected.size} Device${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
