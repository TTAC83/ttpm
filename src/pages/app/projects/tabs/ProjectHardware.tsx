import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ProjectHardwareProps {
  projectId: string;
  type: 'project' | 'solutions' | 'bau';
}

interface HardwareRequirement {
  id: string;
  hardware_type: 'gateway' | 'receiver' | 'device';
  quantity: number;
  notes: string | null;
  gateway_id: string | null;
  receiver_id: string | null;
  hardware_master_id?: string | null;
  gateways_master?: {
    id: string;
    manufacturer: string;
    model_number: string;
    description: string | null;
  } | null;
  receivers_master?: {
    id: string;
    manufacturer: string;
    model_number: string;
    description: string | null;
  } | null;
  hardware_master?: {
    id: string;
    product_name: string;
    sku_no: string;
    description: string | null;
    hardware_type: string;
  } | null;
}

export function ProjectHardware({ projectId, type }: ProjectHardwareProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'gateway' | 'receiver' | 'device' | null>(null);
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  // Fetch hardware requirements
  const { data: requirements = [], isLoading } = useQuery({
    queryKey: ['project-iot-requirements', projectId, type],
    queryFn: async () => {
      const query = supabase
        .from('project_iot_requirements')
        .select(`
          *,
          gateways_master (id, manufacturer, model_number, description),
          receivers_master (id, manufacturer, model_number, description),
          hardware_master (id, product_name, sku_no, description, hardware_type)
        `);

      if (type === 'project') {
        query.eq('project_id', projectId);
      } else if (type === 'solutions') {
        query.eq('solutions_project_id', projectId);
      } else {
        query.eq('bau_customer_id', projectId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as HardwareRequirement[];
    },
  });

  // Fetch gateways
  const { data: gateways = [] } = useQuery({
    queryKey: ['gateways-master'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gateways_master')
        .select('*')
        .order('manufacturer', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: selectedType === 'gateway',
  });

  // Fetch receivers
  const { data: receivers = [] } = useQuery({
    queryKey: ['receivers-master'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receivers_master')
        .select('*')
        .order('manufacturer', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: selectedType === 'receiver',
  });

  // Fetch IoT devices from hardware_master
  const { data: devices = [] } = useQuery({
    queryKey: ['hardware-master-iot'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hardware_master')
        .select('*')
        .in('hardware_type', ['Camera', 'Server', 'TV Display', 'PLC', 'Light', 'Lens'])
        .order('product_name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: selectedType === 'device',
  });

  // Add hardware requirement
  const addMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        hardware_type: selectedType,
        quantity,
        notes: notes || null,
      };

      if (type === 'project') {
        payload.project_id = projectId;
      } else if (type === 'solutions') {
        payload.solutions_project_id = projectId;
      } else {
        payload.bau_customer_id = projectId;
      }

      if (selectedType === 'gateway') {
        payload.gateway_id = selectedHardwareId;
      } else if (selectedType === 'receiver') {
        payload.receiver_id = selectedHardwareId;
      } else if (selectedType === 'device') {
        payload.hardware_master_id = selectedHardwareId;
      }

      const { error } = await supabase
        .from('project_iot_requirements')
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-iot-requirements', projectId, type] });
      toast({ title: 'Hardware requirement added' });
      handleCloseDialog();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete hardware requirement
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error} = await supabase
        .from('project_iot_requirements')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-iot-requirements', projectId, type] });
      toast({ title: 'Hardware requirement removed' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleOpenDialog = (hwType: 'gateway' | 'receiver' | 'device') => {
    setSelectedType(hwType);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedType(null);
    setSelectedHardwareId('');
    setQuantity(1);
    setNotes('');
  };

  const handleAdd = () => {
    if (!selectedHardwareId) {
      toast({
        title: 'Error',
        description: 'Please select hardware',
        variant: 'destructive',
      });
      return;
    }
    addMutation.mutate();
  };

  const gatewayRequirements = requirements.filter(r => r.hardware_type === 'gateway');
  const receiverRequirements = requirements.filter(r => r.hardware_type === 'receiver');
  const deviceRequirements = requirements.filter(r => r.hardware_type === 'device');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>IoT Requirements</CardTitle>
          <CardDescription>Manage IoT hardware requirements for this project</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* IoT Gateways */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">IoT Gateways</h3>
              <Button size="sm" onClick={() => handleOpenDialog('gateway')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Gateway
              </Button>
            </div>
            {gatewayRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gateways added yet</p>
            ) : (
              <div className="space-y-2">
                {gatewayRequirements.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <p className="font-medium">
                            {req.gateways_master?.manufacturer} - {req.gateways_master?.model_number}
                          </p>
                          {req.gateways_master?.description && (
                            <p className="text-sm text-muted-foreground">{req.gateways_master.description}</p>
                          )}
                          <p className="text-sm">
                            <span className="font-medium">Quantity:</span> {req.quantity}
                          </p>
                          {req.notes && (
                            <p className="text-sm text-muted-foreground">{req.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(req.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* IoT Receivers */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">IoT Receivers</h3>
              <Button size="sm" onClick={() => handleOpenDialog('receiver')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Receiver
              </Button>
            </div>
            {receiverRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No receivers added yet</p>
            ) : (
              <div className="space-y-2">
                {receiverRequirements.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <p className="font-medium">
                            {req.receivers_master?.manufacturer} - {req.receivers_master?.model_number}
                          </p>
                          {req.receivers_master?.description && (
                            <p className="text-sm text-muted-foreground">{req.receivers_master.description}</p>
                          )}
                          <p className="text-sm">
                            <span className="font-medium">Quantity:</span> {req.quantity}
                          </p>
                          {req.notes && (
                            <p className="text-sm text-muted-foreground">{req.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(req.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* IoT Devices */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">IoT Devices</h3>
              <Button size="sm" onClick={() => handleOpenDialog('device')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Device
              </Button>
            </div>
            {deviceRequirements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No devices added yet</p>
            ) : (
              <div className="space-y-2">
                {deviceRequirements.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <p className="font-medium">
                            {req.hardware_master?.product_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {req.hardware_master?.hardware_type} - {req.hardware_master?.sku_no}
                          </p>
                          {req.hardware_master?.description && (
                            <p className="text-sm text-muted-foreground">{req.hardware_master.description}</p>
                          )}
                          <p className="text-sm">
                            <span className="font-medium">Quantity:</span> {req.quantity}
                          </p>
                          {req.notes && (
                            <p className="text-sm text-muted-foreground">{req.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(req.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Hardware Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {selectedType === 'gateway' ? 'Gateway' : selectedType === 'receiver' ? 'Receiver' : 'IoT Device'}
            </DialogTitle>
            <DialogDescription>
              Select a {selectedType === 'device' ? 'device' : selectedType} from the master data catalog
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select {selectedType === 'gateway' ? 'Gateway' : selectedType === 'receiver' ? 'Receiver' : 'IoT Device'}</Label>
              <Select value={selectedHardwareId} onValueChange={setSelectedHardwareId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${selectedType === 'device' ? 'device' : selectedType}`} />
                </SelectTrigger>
                <SelectContent>
                  {selectedType === 'gateway' &&
                    gateways.map((gateway) => (
                      <SelectItem key={gateway.id} value={gateway.id}>
                        {gateway.manufacturer} - {gateway.model_number}
                      </SelectItem>
                    ))}
                  {selectedType === 'receiver' &&
                    receivers.map((receiver) => (
                      <SelectItem key={receiver.id} value={receiver.id}>
                        {receiver.manufacturer} - {receiver.model_number}
                      </SelectItem>
                    ))}
                  {selectedType === 'device' &&
                    devices.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.product_name} ({device.hardware_type})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Adding...' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectHardware;
