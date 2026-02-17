import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export interface CameraWithContext {
  id: string;
  mac_address: string;
  line_name: string;
  position_name: string;
  equipment_name: string;
  use_cases: string[];
  attributes: string[];
}

interface AssignCamerasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unassignedCameras: CameraWithContext[];
  onAssign: (cameraIds: string[]) => void;
  isPending: boolean;
  serverName: string;
}

export function AssignCamerasDialog({
  open,
  onOpenChange,
  unassignedCameras,
  onAssign,
  isPending,
  serverName,
}: AssignCamerasDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === unassignedCameras.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(unassignedCameras.map(c => c.id)));
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
          <DialogTitle>Assign Cameras to {serverName}</DialogTitle>
          <DialogDescription>
            Select cameras to assign to this server. Only unassigned cameras are shown.
          </DialogDescription>
        </DialogHeader>

        {unassignedCameras.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">All cameras have been assigned to servers.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={selected.size === unassignedCameras.length && unassignedCameras.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </TableHead>
                <TableHead>Line</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Equipment</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Use Cases</TableHead>
                <TableHead>Attributes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unassignedCameras.map(cam => (
                <TableRow key={cam.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.has(cam.id)}
                      onCheckedChange={() => toggleOne(cam.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{cam.line_name}</TableCell>
                  <TableCell>{cam.position_name}</TableCell>
                  <TableCell>{cam.equipment_name}</TableCell>
                  <TableCell className="font-mono text-xs">{cam.mac_address}</TableCell>
                  <TableCell>
                    {cam.use_cases.length > 0
                      ? cam.use_cases.join(', ')
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {cam.attributes.map(attr => (
                        <Badge key={attr} variant="outline" className="text-xs">
                          {attr}
                        </Badge>
                      ))}
                      {cam.attributes.length === 0 && <span className="text-muted-foreground">—</span>}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={selected.size === 0 || isPending}
          >
            {isPending ? 'Assigning...' : `Assign ${selected.size} Camera${selected.size !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
