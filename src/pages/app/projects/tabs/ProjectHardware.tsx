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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Cpu, Camera, Monitor, Server, HardDrive, Network, ChevronDown, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { AssignCamerasDialog, type CameraWithContext } from '@/components/AssignCamerasDialog';

interface ProjectHardwareProps {
  projectId: string;
  type: 'project' | 'solutions' | 'bau';
}

interface HardwareRequirement {
  id: string;
  hardware_type: 'gateway' | 'receiver' | 'device' | 'server' | 'sfp_addon' | 'load_balancer' | 'storage' | 'vpn' | 'tv_display';
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
  const [selectedType, setSelectedType] = useState<'gateway' | 'receiver' | 'server' | 'sfp_addon' | 'load_balancer' | 'storage' | 'vpn' | null>(null);
  const [selectedHardwareId, setSelectedHardwareId] = useState<string>('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTargetServerId, setAssignTargetServerId] = useState<string>('');
  const [assignTargetServerName, setAssignTargetServerName] = useState<string>('');

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
    queryKey: ['project-iot-devices-from-lines', projectId, type],
    queryFn: async () => {
      if (type === 'solutions') {
        // For solutions projects, query solutions_lines
        const { data: solutionsLines, error: linesError } = await supabase
          .from('solutions_lines')
          .select('id')
          .eq('solutions_project_id', projectId);
        
        if (linesError) throw linesError;
        if (!solutionsLines || solutionsLines.length === 0) return [];

        const lineIds = solutionsLines.map(l => l.id);

        // Get positions for these solutions lines
        const { data: positions, error: positionsError } = await supabase
          .from('positions')
          .select('id')
          .in('line_id', lineIds);

        if (positionsError) throw positionsError;
        if (!positions || positions.length === 0) return [];

        const positionIds = positions.map(p => p.id);

        // Get all equipment attached to these positions
        const { data: equipment, error: equipmentError } = await supabase
          .from('equipment')
          .select('id, name')
          .in('position_id', positionIds);
        
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
      } else if (type === 'project') {
        // For implementation projects, query lines
        const { data: lines, error: linesError } = await supabase
          .from('lines')
          .select('id')
          .eq('project_id', projectId);
        
        if (linesError) throw linesError;
        if (!lines || lines.length === 0) return [];

        const lineIds = lines.map(l => l.id);

        // Get all equipment for these lines (using line_id)
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
      }
      
      // For BAU, return empty (or could implement similar logic if needed)
      return [];
    },
  });

  // Fetch all cameras with full context for camera-server assignment
  const { data: camerasWithContext = [] } = useQuery<CameraWithContext[]>({
    queryKey: ['project-cameras-context', projectId, type],
    queryFn: async () => {
      if (type !== 'solutions') return [];

      const { data: solutionsLines, error: linesError } = await supabase
        .from('solutions_lines')
        .select('id, line_name')
        .eq('solutions_project_id', projectId);
      if (linesError) throw linesError;
      if (!solutionsLines || solutionsLines.length === 0) return [];

      const lineIds = solutionsLines.map(l => l.id);
      const { data: positions, error: posError } = await supabase
        .from('positions')
        .select('id, name, solutions_line_id')
        .in('solutions_line_id', lineIds);
      if (posError) throw posError;
      if (!positions || positions.length === 0) return [];

      const positionIds = positions.map(p => p.id);
      const { data: equipment, error: eqError } = await supabase
        .from('equipment')
        .select('id, name, position_id')
        .in('position_id', positionIds);
      if (eqError) throw eqError;
      if (!equipment || equipment.length === 0) return [];

      const equipmentIds = equipment.map(e => e.id);
      const { data: cameras, error: camError } = await supabase
        .from('cameras')
        .select('id, mac_address, equipment_id')
        .in('equipment_id', equipmentIds);
      if (camError) throw camError;
      if (!cameras || cameras.length === 0) return [];

      const cameraIds = cameras.map(c => c.id);

      // Fetch use cases and attributes in parallel
      const [useCasesRes, attributesRes] = await Promise.all([
        supabase
          .from('camera_use_cases')
          .select('camera_id, vision_use_cases_master(name)')
          .in('camera_id', cameraIds),
        supabase
          .from('camera_attributes')
          .select('camera_id, title')
          .in('camera_id', cameraIds),
      ]);

      if (useCasesRes.error) throw useCasesRes.error;
      if (attributesRes.error) throw attributesRes.error;

      // Build lookup maps
      const useCaseMap = new Map<string, string[]>();
      for (const uc of useCasesRes.data || []) {
        const name = (uc.vision_use_cases_master as any)?.name;
        if (!name) continue;
        const arr = useCaseMap.get(uc.camera_id) || [];
        arr.push(name);
        useCaseMap.set(uc.camera_id, arr);
      }

      const attrMap = new Map<string, string[]>();
      for (const a of attributesRes.data || []) {
        const arr = attrMap.get(a.camera_id) || [];
        arr.push(a.title);
        attrMap.set(a.camera_id, arr);
      }

      const lineMap = new Map(solutionsLines.map(l => [l.id, l.line_name]));
      const posMap = new Map(positions.map(p => [p.id, { name: p.name, line_id: p.solutions_line_id }]));
      const eqMap = new Map(equipment.map(e => [e.id, { name: e.name, position_id: e.position_id }]));

      return cameras.map(cam => {
        const eq = eqMap.get(cam.equipment_id);
        const pos = eq ? posMap.get(eq.position_id) : undefined;
        const lineName = pos ? lineMap.get(pos.line_id) || 'Unknown' : 'Unknown';

        return {
          id: cam.id,
          mac_address: cam.mac_address,
          line_name: lineName,
          position_name: pos?.name || 'Unknown',
          equipment_name: eq?.name || 'Unknown',
          use_cases: useCaseMap.get(cam.id) || [],
          attributes: attrMap.get(cam.id) || [],
        };
      });
    },
    enabled: type === 'solutions',
  });

  // Fetch camera-server assignments
  const { data: cameraAssignments = [] } = useQuery({
    queryKey: ['camera-server-assignments', projectId],
    queryFn: async () => {
      // Get all server requirement IDs for this project
      const serverReqs = requirements.filter(r => r.hardware_type === 'server');
      if (serverReqs.length === 0) return [];
      const serverIds = serverReqs.map(r => r.id);
      const { data, error } = await supabase
        .from('camera_server_assignments')
        .select('id, camera_id, server_requirement_id')
        .in('server_requirement_id', serverIds);
      if (error) throw error;
      return data || [];
    },
    enabled: type === 'solutions' && requirements.length > 0,
  });

  // Assign cameras mutation
  const assignCamerasMutation = useMutation({
    mutationFn: async ({ cameraIds, serverId }: { cameraIds: string[]; serverId: string }) => {
      const rows = cameraIds.map(camera_id => ({
        camera_id,
        server_requirement_id: serverId,
      }));
      const { error } = await supabase.from('camera_server_assignments').insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camera-server-assignments', projectId] });
      toast({ title: 'Cameras assigned successfully' });
      setAssignDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Unassign camera mutation
  const unassignCameraMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase.from('camera_server_assignments').delete().eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camera-server-assignments', projectId] });
      toast({ title: 'Camera unassigned' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
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
      if (!selectedType || !['server', 'sfp_addon', 'load_balancer', 'storage', 'vpn'].includes(selectedType)) {
        return [];
      }

      // Map our internal types to the database values
      const typeMapping: Record<string, string> = {
        'server': 'Server',
        'sfp_addon': '10G SFP ADDON',
        'load_balancer': 'Load Balancer',
        'storage': 'Storage',
        'vpn': 'VPN'
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
    enabled: selectedType !== null && ['server', 'sfp_addon', 'load_balancer', 'storage', 'vpn'].includes(selectedType),
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
      } else if (['server', 'sfp_addon', 'load_balancer', 'storage', 'vpn'].includes(selectedType)) {
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

  const handleOpenDialog = (hwType: 'gateway' | 'receiver' | 'server' | 'sfp_addon' | 'load_balancer' | 'storage' | 'vpn') => {
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
  const vpnRequirements = requirements.filter(r => r.hardware_type === 'vpn');

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
      case 'vpn': return 'VPN';
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
                Vision ({serverRequirements.length + sfpAddonRequirements.length + loadBalancerRequirements.length + storageRequirements.length + vpnRequirements.length})
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
                    {serverRequirements.map((req) => {
                      const assignedToThis = cameraAssignments.filter(a => a.server_requirement_id === req.id);
                      const assignedCameraIds = new Set(cameraAssignments.map(a => a.camera_id));
                      const assignedCamerasForServer = assignedToThis
                        .map(a => camerasWithContext.find(c => c.id === a.camera_id))
                        .filter(Boolean) as CameraWithContext[];

                      return (
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
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setAssignTargetServerId(req.id);
                                    setAssignTargetServerName(req.name || req.hardware_master?.product_name || 'Server');
                                    setAssignDialogOpen(true);
                                  }}
                                >
                                  <Camera className="h-4 w-4 mr-1" />
                                  Assign Cameras
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteMutation.mutate(req.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {/* Assigned cameras collapsible */}
                            {type === 'solutions' && (
                              <Collapsible className="mt-4">
                                <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                                  <ChevronDown className="h-4 w-4" />
                                  Assigned Cameras ({assignedCamerasForServer.length}/{camerasWithContext.length})
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2">
                                  {assignedCamerasForServer.length === 0 ? (
                                    <p className="text-sm text-muted-foreground pl-6">No cameras assigned to this server yet.</p>
                                  ) : (
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>Line</TableHead>
                                          <TableHead>Position</TableHead>
                                          <TableHead>Equipment</TableHead>
                                          <TableHead>Camera</TableHead>
                                          <TableHead>Use Cases</TableHead>
                                          <TableHead className="w-10"></TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {assignedCamerasForServer.map(cam => {
                                          const assignment = assignedToThis.find(a => a.camera_id === cam.id);
                                          return (
                                            <TableRow key={cam.id}>
                                              <TableCell className="font-medium">{cam.line_name}</TableCell>
                                              <TableCell>{cam.position_name}</TableCell>
                                              <TableCell>{cam.equipment_name}</TableCell>
                                              <TableCell className="font-mono text-xs">{cam.mac_address}</TableCell>
                                              <TableCell>{cam.use_cases.join(', ') || '—'}</TableCell>
                                              <TableCell>
                                                <Button
                                                  variant="ghost"
                                                  size="sm"
                                                  onClick={() => assignment && unassignCameraMutation.mutate(assignment.id)}
                                                >
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </TableCell>
                                            </TableRow>
                                          );
                                        })}
                                      </TableBody>
                                    </Table>
                                  )}
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
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

              {/* VPN */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">VPN</h3>
                  <Button size="sm" onClick={() => handleOpenDialog('vpn')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add VPN
                  </Button>
                </div>
                {vpnRequirements.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No VPN added yet</p>
                ) : (
                  <div className="space-y-2">
                    {vpnRequirements.map((req) => (
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
                  {['server', 'sfp_addon', 'load_balancer', 'storage', 'vpn'].includes(selectedType || '') &&
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

      {/* Assign Cameras Dialog */}
      <AssignCamerasDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        unassignedCameras={camerasWithContext.filter(
          c => !cameraAssignments.some(a => a.camera_id === c.id)
        )}
        onAssign={(cameraIds) =>
          assignCamerasMutation.mutate({ cameraIds, serverId: assignTargetServerId })
        }
        isPending={assignCamerasMutation.isPending}
        serverName={assignTargetServerName}
      />
    </div>
  );
}

export default ProjectHardware;
