import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface HardwareItem {
  id: string;
  hardware_type: string;
  source: 'direct' | 'line';
  line_name?: string;
  equipment_name?: string;
  quantity?: number;
  sku_no?: string;
  manufacturer?: string;
  model_number?: string;
  description?: string;
  price?: number;
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  order_hyperlink?: string;
}

interface SolutionsHardwareSummaryProps {
  solutionsProjectId: string;
}

export const SolutionsHardwareSummary = ({ solutionsProjectId }: SolutionsHardwareSummaryProps) => {
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllHardware();
  }, [solutionsProjectId]);

  const fetchAllHardware = async () => {
    try {
      setLoading(true);
      const allHardware: HardwareItem[] = [];
      
      // ============= CAMERAS FROM LINES =============
      const { data: cameraData } = await supabase
        .from('cameras')
        .select(`
          id,
          camera_type,
          equipment!inner(
            id,
            name,
            solutions_line_id
          )
        `);

      if (cameraData) {
        // Get line names for cameras
        const lineIds = [...new Set(cameraData
          .map(c => c.equipment?.solutions_line_id)
          .filter(Boolean))] as string[];
        
        const { data: lines } = await supabase
          .from('solutions_lines')
          .select('id, line_name, solutions_project_id')
          .in('id', lineIds)
          .eq('solutions_project_id', solutionsProjectId);

        const { data: cameraMaster } = await supabase
          .from('cameras_master')
          .select('*');

        cameraData.forEach((cam: any) => {
          const line = lines?.find(l => l.id === cam.equipment?.solutions_line_id);
          if (line) {
            const master = cameraMaster?.find(m => m.camera_type === cam.camera_type);
            allHardware.push({
              id: `camera-${cam.id}`,
              hardware_type: `Camera - ${cam.camera_type}`,
              source: 'line',
              line_name: line.line_name,
              equipment_name: cam.equipment?.name,
              sku_no: master?.model_number,
              manufacturer: master?.manufacturer,
              model_number: master?.model_number,
              description: master?.description,
              price: master?.price,
              supplier_name: master?.supplier_name,
              supplier_person: master?.supplier_person,
              supplier_email: master?.supplier_email,
              supplier_phone: master?.supplier_phone,
              order_hyperlink: master?.order_hyperlink,
            });
          }
        });
      }

      // ============= IOT DEVICES FROM LINES =============
      const { data: iotData } = await supabase
        .from('iot_devices')
        .select(`
          id,
          name,
          mac_address,
          equipment!inner(
            id,
            name,
            solutions_line_id
          ),
          hardware_master(
            sku_no,
            product_name,
            manufacturer,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          )
        `);

      if (iotData) {
        const lineIds = [...new Set(iotData
          .map((d: any) => d.equipment?.solutions_line_id)
          .filter(Boolean))] as string[];
        
        const { data: lines } = await supabase
          .from('solutions_lines')
          .select('id, line_name, solutions_project_id')
          .in('id', lineIds)
          .eq('solutions_project_id', solutionsProjectId);

        iotData.forEach((device: any) => {
          const line = lines?.find(l => l.id === device.equipment?.solutions_line_id);
          if (line) {
            const master = device.hardware_master;
            allHardware.push({
              id: `iot-${device.id}`,
              hardware_type: `IoT Device - ${device.name}`,
              source: 'line',
              line_name: line.line_name,
              equipment_name: device.equipment?.name,
              sku_no: master?.sku_no,
              manufacturer: master?.manufacturer,
              model_number: master?.sku_no,
              description: master?.description,
              price: master?.price,
              supplier_name: master?.supplier_name,
              supplier_person: master?.supplier_person,
              supplier_email: master?.supplier_email,
              supplier_phone: master?.supplier_phone,
              order_hyperlink: master?.order_hyperlink,
            });
          }
        });
      }

      // ============= DIRECT HARDWARE (From Hardware Tab) =============
      
      // Gateways
      const { data: directGateways } = await supabase
        .from('solutions_project_gateways')
        .select(`
          id,
          quantity,
          gateways_master(
            manufacturer,
            model_number,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (directGateways) {
        directGateways.forEach((gw: any) => {
          const master = gw.gateways_master;
          allHardware.push({
            id: `direct-gw-${gw.id}`,
            hardware_type: `Gateway - ${master?.model_number || 'Unknown'}`,
            source: 'direct',
            quantity: gw.quantity,
            sku_no: master?.model_number,
            manufacturer: master?.manufacturer,
            model_number: master?.model_number,
            description: master?.description,
            price: master?.price,
            supplier_name: master?.supplier_name,
            supplier_person: master?.supplier_person,
            supplier_email: master?.supplier_email,
            supplier_phone: master?.supplier_phone,
            order_hyperlink: master?.order_hyperlink,
          });
        });
      }

      // Servers
      const { data: directServers } = await supabase
        .from('solutions_project_servers')
        .select(`
          id,
          quantity,
          servers_master(
            manufacturer,
            model_number,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (directServers) {
        directServers.forEach((srv: any) => {
          const master = srv.servers_master;
          allHardware.push({
            id: `direct-srv-${srv.id}`,
            hardware_type: `Server - ${master?.model_number || 'Unknown'}`,
            source: 'direct',
            quantity: srv.quantity,
            sku_no: master?.model_number,
            manufacturer: master?.manufacturer,
            model_number: master?.model_number,
            description: master?.description,
            price: master?.price,
            supplier_name: master?.supplier_name,
            supplier_person: master?.supplier_person,
            supplier_email: master?.supplier_email,
            supplier_phone: master?.supplier_phone,
            order_hyperlink: master?.order_hyperlink,
          });
        });
      }

      // Receivers
      const { data: directReceivers } = await supabase
        .from('solutions_project_receivers')
        .select(`
          id,
          quantity,
          receivers_master(
            manufacturer,
            model_number,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (directReceivers) {
        directReceivers.forEach((rcv: any) => {
          const master = rcv.receivers_master;
          allHardware.push({
            id: `direct-rcv-${rcv.id}`,
            hardware_type: `Receiver - ${master?.model_number || 'Unknown'}`,
            source: 'direct',
            quantity: rcv.quantity,
            sku_no: master?.model_number,
            manufacturer: master?.manufacturer,
            model_number: master?.model_number,
            description: master?.description,
            price: master?.price,
            supplier_name: master?.supplier_name,
            supplier_person: master?.supplier_person,
            supplier_email: master?.supplier_email,
            supplier_phone: master?.supplier_phone,
            order_hyperlink: master?.order_hyperlink,
          });
        });
      }

      // TV Displays
      const { data: directTVs } = await supabase
        .from('solutions_project_tv_displays')
        .select(`
          id,
          quantity,
          tv_displays_master(
            manufacturer,
            model_number,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (directTVs) {
        directTVs.forEach((tv: any) => {
          const master = tv.tv_displays_master;
          allHardware.push({
            id: `direct-tv-${tv.id}`,
            hardware_type: `TV Display - ${master?.model_number || 'Unknown'}`,
            source: 'direct',
            quantity: tv.quantity,
            sku_no: master?.model_number,
            manufacturer: master?.manufacturer,
            model_number: master?.model_number,
            description: master?.description,
            price: master?.price,
            supplier_name: master?.supplier_name,
            supplier_person: master?.supplier_person,
            supplier_email: master?.supplier_email,
            supplier_phone: master?.supplier_phone,
            order_hyperlink: master?.order_hyperlink,
          });
        });
      }

      // Other hardware requirements (servers, storage, load balancers, etc.)
      const { data: iotRequirements } = await supabase
        .from('project_iot_requirements')
        .select(`
          id,
          hardware_type,
          name,
          quantity,
          gateways_master(
            manufacturer,
            model_number,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          ),
          receivers_master(
            manufacturer,
            model_number,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          ),
          hardware_master(
            sku_no,
            product_name,
            manufacturer,
            description,
            price,
            supplier_name,
            supplier_person,
            supplier_email,
            supplier_phone,
            order_hyperlink
          )
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (iotRequirements) {
        iotRequirements.forEach((req: any) => {
          const master = req.hardware_master || req.gateways_master || req.receivers_master;
          if (master) {
            allHardware.push({
              id: `direct-hw-${req.id}`,
              hardware_type: `${req.hardware_type} - ${req.name || master?.product_name || master?.model_number || 'Unknown'}`,
              source: 'direct',
              quantity: req.quantity,
              sku_no: master?.sku_no || master?.model_number,
              manufacturer: master?.manufacturer,
              model_number: master?.sku_no || master?.model_number,
              description: master?.description,
              price: master?.price,
              supplier_name: master?.supplier_name,
              supplier_person: master?.supplier_person,
              supplier_email: master?.supplier_email,
              supplier_phone: master?.supplier_phone,
              order_hyperlink: master?.order_hyperlink,
            });
          }
        });
      }

      setHardware(allHardware);
    } catch (error) {
      console.error('Error fetching hardware:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch hardware summary',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hardware Summary</CardTitle>
        <CardDescription>
          All hardware attributed to this solutions project from Hardware and Lines tabs
        </CardDescription>
      </CardHeader>

      <CardContent>
        {hardware.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hardware configured yet
          </div>
        ) : (
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Line/Equipment</TableHead>
                  <TableHead>SKU/Model</TableHead>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hardware.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.hardware_type}</TableCell>
                    <TableCell>
                      <Badge variant={item.source === 'line' ? 'default' : 'secondary'}>
                        {item.source === 'line' ? 'Line' : 'Direct'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.quantity || 1}
                    </TableCell>
                    <TableCell>
                      {item.line_name && <div className="text-sm">{item.line_name}</div>}
                      {item.equipment_name && <div className="text-xs text-muted-foreground">{item.equipment_name}</div>}
                      {!item.line_name && !item.equipment_name && <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>{item.model_number || 'N/A'}</TableCell>
                    <TableCell>{item.manufacturer || 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={item.description || undefined}>
                      {item.description || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.price ? `$${item.price.toLocaleString()}` : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.supplier_name && <div className="text-sm">{item.supplier_name}</div>}
                      {item.supplier_person && <div className="text-xs text-muted-foreground">{item.supplier_person}</div>}
                      {!item.supplier_name && !item.supplier_person && <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      {item.supplier_email && (
                        <a 
                          href={`mailto:${item.supplier_email}`}
                          className="text-sm text-primary hover:underline block"
                        >
                          {item.supplier_email}
                        </a>
                      )}
                      {item.supplier_phone && (
                        <div className="text-xs text-muted-foreground">{item.supplier_phone}</div>
                      )}
                      {item.order_hyperlink && (
                        <a 
                          href={item.order_hyperlink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline"
                        >
                          Order Link
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
