import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Cpu, Camera, Monitor, Server, HardDrive, Network } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ProjectHardwareProps {
  projectId: string;
  type: 'project' | 'solutions' | 'bau';
}

interface HardwareRequirement {
  id: string;
  hardware_type: 'gateway' | 'receiver' | 'device' | 'server' | 'sfp_addon' | 'load_balancer' | 'storage' | 'tv_display';
  name: string | null;
  quantity: number;
  notes: string | null;
  gateway_id: string | null;
  receiver_id: string | null;
  hardware_master_id: string | null;
  tv_display_id: string | null;
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
    sku_no: string;
    product_name: string;
    hardware_type: string;
    type: string;
    description: string | null;
  } | null;
}

export function ProjectHardware({ projectId, type }: ProjectHardwareProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'gateway' | 'receiver' | 'server' | 'sfp_addon' | 'load_balancer' | 'storage' | null>(null);
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('');
  const [name, setName] = useState('');
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
          hardware_master (id, sku_no, product_name, hardware_type, type, description)
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
      return data as any as HardwareRequirement[];
    },
  });

  // Fetch IoT devices from lines/equipment
  const { data: iotDevicesFromLines = [] } = useQuery({
    queryKey: ['project-iot-devices-from-lines', projectId],
    queryFn: async () => {
      // First get all lines for this project
      const { data: lines, error: linesError } = await supabase
        .from('lines')
        .select('id')
        .eq('project_id', projectId);
      
      if (linesError) throw linesError;
      if (!lines || lines.length === 0) return [];

      const lineIds = lines.map(l => l.id);

      // Get all equipment for these lines
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, name')
        .in('line_id', lineIds);
      
      if (equipmentError) throw equipmentError;
      if (!equipment || equipment.length === 0) return [];

      const equipmentIds = equipment.map(e => e.id);

      // Get all IoT devices for this equipment
      const { data: iotDevices, error: iotError } = await supabase
        .from('iot_devices')
        .select(`
          id,
          name,
          mac_address,
          receiver_mac_address,
          hardware_master_id,
          equipment_id,
          hardware_master (
            id,
            sku_no,
            product_name,
            hardware_type,
            description
          )
        `)
        .in('equipment_id', equipmentIds);
      
      if (iotError) throw iotError;

      // Add equipment name to each device
      return (iotDevices || []).map(device => ({
        ...device,
        equipment_name: equipment.find(e => e.id === device.equipment_id)?.name || 'Unknown Equipment'
      }));
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

  // Fetch hardware master data filtered by type
  const { data: hardwareMaster = [] } = useQuery({
    queryKey: ['hardware-master', selectedType],
    queryFn: async () => {
      if (!selectedType || !['server', 'sfp_addon', 'load_balancer', 'storage'].includes(selectedType)) {
        return [];
      }

      // Map our internal types to the database values
      const typeMapping: Record<string, string> = {
        'server': 'Server',
        'sfp_addon': '10G SFP ADDON',
        'load_balancer': 'Load Balancer',
        'storage': 'Storage'
      };

      const dbHardwareType = typeMapping[selectedType];

      const { data, error } = await supabase
        .from('hardware_master')
        .select('*')
        .eq('hardware_type', dbHardwareType)
        .order('product_name', { ascending: true });
      
      if (error) throw error;
      return data;
    },
    enabled: selectedType !== null && ['server', 'sfp_addon', 'load_balancer', 'storage'].includes(selectedType),
  });


  // Add hardware requirement
  const addMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        hardware_type: selectedType,
        name,
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
      } else if (['server', 'sfp_addon', 'load_balancer', 'storage'].includes(selectedType)) {
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

  const handleOpenDialog = (hwType: 'gateway' | 'receiver' | 'server' | 'sfp_addon' | 'load_balancer' | 'storage') => {
    setSelectedType(hwType);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedType(null);
    setSelectedHardwareId('');
    setName('');
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
  const serverRequirements = requirements.filter(r => r.hardware_type === 'server');
  const sfpAddonRequirements = requirements.filter(r => r.hardware_type === 'sfp_addon');
  const loadBalancerRequirements = requirements.filter(r => r.hardware_type === 'load_balancer');
  const storageRequirements = requirements.filter(r => r.hardware_type === 'storage');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  const getHardwareLabel = () => {
    switch (selectedType) {
      case 'gateway': return 'Gateway';
      case 'receiver': return 'Receiver';
      case 'server': return 'Server';
      case 'sfp_addon': return '10G SFP ADDON';
      case 'load_balancer': return 'Load Balancer';
      case 'storage': return 'Storage';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Hardware Requirements</CardTitle>
          <CardDescription>Manage all hardware requirements for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="iot" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="iot" className="flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                IoT ({gatewayRequirements.length + receiverRequirements.length + iotDevicesFromLines.length})
              </TabsTrigger>
              <TabsTrigger value="vision" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Vision ({serverRequirements.length + sfpAddonRequirements.length + loadBalancerRequirements.length + storageRequirements.length})
              </TabsTrigger>
            </TabsList>

            {/* IoT Requirements Tab */}
            <TabsContent value="iot" className="space-y-6 mt-6">
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
                          {req.name && (
                            <p className="text-lg font-semibold">{req.name}</p>
                          )}
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
                          {req.name && (
                            <p className="text-lg font-semibold">{req.name}</p>
                          )}
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
                </div>
                {iotDevicesFromLines.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No IoT devices added in line configuration yet</p>
                ) : (
                  <div className="space-y-2">
                    {iotDevicesFromLines.map((device: any) => (
                      <Card key={device.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <Cpu className="h-4 w-4 text-blue-600" />
                                <p className="text-lg font-semibold">{device.name}</p>
                              </div>
                              {device.hardware_master && (
                                <p className="font-medium">
                                  {device.hardware_master.sku_no} - {device.hardware_master.product_name}
                                </p>
                              )}
                              {device.hardware_master?.description && (
                                <p className="text-sm text-muted-foreground">{device.hardware_master.description}</p>
                              )}
                              <p className="text-sm">
                                <span className="font-medium">Equipment:</span> {device.equipment_name}
                              </p>
                              {device.mac_address && (
                                <p className="text-sm">
                                  <span className="font-medium">MAC Address:</span> {device.mac_address}
                                </p>
                              )}
                              {device.receiver_mac_address && (
                                <p className="text-sm">
                                  <span className="font-medium">Receiver MAC:</span> {device.receiver_mac_address}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Vision Requirements Tab */}
            <TabsContent value="vision" className="space-y-6 mt-6">
              {/* Servers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Servers</h3>
                  <Button size="sm" onClick={() => handleOpenDialog('server')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Server
                  </Button>
                </div>
                {serverRequirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No servers added yet</p>
                ) : (
                  <div className="space-y-2">
                    {serverRequirements.map((req) => (
                      <Card key={req.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              {req.name && (
                                <p className="text-lg font-semibold">{req.name}</p>
                              )}
                              <p className="font-medium">
                                {req.hardware_master?.sku_no} - {req.hardware_master?.product_name}
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

              {/* 10G SFP ADDON */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">10G SFP ADDON</h3>
                  <Button size="sm" onClick={() => handleOpenDialog('sfp_addon')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add 10G SFP ADDON
                  </Button>
                </div>
                {sfpAddonRequirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No 10G SFP addons added yet</p>
                ) : (
                  <div className="space-y-2">
                    {sfpAddonRequirements.map((req) => (
                      <Card key={req.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              {req.name && (
                                <p className="text-lg font-semibold">{req.name}</p>
                              )}
                              <p className="font-medium">
                                {req.hardware_master?.sku_no} - {req.hardware_master?.product_name}
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

              {/* Load Balancers */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Load Balancers</h3>
                  <Button size="sm" onClick={() => handleOpenDialog('load_balancer')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Load Balancer
                  </Button>
                </div>
                {loadBalancerRequirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No load balancers added yet</p>
                ) : (
                  <div className="space-y-2">
                    {loadBalancerRequirements.map((req) => (
                      <Card key={req.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              {req.name && (
                                <p className="text-lg font-semibold">{req.name}</p>
                              )}
                              <p className="font-medium">
                                {req.hardware_master?.sku_no} - {req.hardware_master?.product_name}
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

              {/* Storage */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Storage</h3>
                  <Button size="sm" onClick={() => handleOpenDialog('storage')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Storage
                  </Button>
                </div>
                {storageRequirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No storage added yet</p>
                ) : (
                  <div className="space-y-2">
                    {storageRequirements.map((req) => (
                      <Card key={req.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              {req.name && (
                                <p className="text-lg font-semibold">{req.name}</p>
                              )}
                              <p className="font-medium">
                                {req.hardware_master?.sku_no} - {req.hardware_master?.product_name}
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
            </TabsContent>

          </Tabs>
        </CardContent>
      </Card>

      {/* Add Hardware Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {getHardwareLabel()}
            </DialogTitle>
            <DialogDescription>
              Select a {getHardwareLabel().toLowerCase()} from the master data catalog
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select {getHardwareLabel()}</Label>
              <Select value={selectedHardwareId} onValueChange={setSelectedHardwareId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select a ${getHardwareLabel().toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {selectedType === 'gateway' &&
                    gateways.map((gateway: any) => (
                      <SelectItem key={gateway.id} value={gateway.id}>
                        {gateway.manufacturer} - {gateway.model_number}
                      </SelectItem>
                    ))}
                  {selectedType === 'receiver' &&
                    receivers.map((receiver: any) => (
                      <SelectItem key={receiver.id} value={receiver.id}>
                        {receiver.manufacturer} - {receiver.model_number}
                      </SelectItem>
                    ))}
                  {['server', 'sfp_addon', 'load_balancer', 'storage'].includes(selectedType || '') &&
                    hardwareMaster.map((hardware: any) => (
                      <SelectItem key={hardware.id} value={hardware.id}>
                        {hardware.sku_no} - {hardware.product_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name for this hardware"
              />
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
