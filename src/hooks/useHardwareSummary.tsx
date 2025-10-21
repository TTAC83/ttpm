import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HardwareItem {
  id: string;
  hardware_type: string;
  source: 'direct' | 'line';
  line_name?: string;
  equipment_name?: string;
  quantity: number;
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

export const useHardwareSummary = (solutionsProjectId: string) => {
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

      // Get all line IDs for this solutions project
      const { data: lines } = await supabase
        .from('solutions_lines')
        .select('id, line_name')
        .eq('solutions_project_id', solutionsProjectId);

      const lineIds = lines?.map(l => l.id) || [];

      // ============= CAMERAS FROM LINES =============
      if (lineIds.length > 0) {
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
          `)
          .in('equipment.solutions_line_id', lineIds);

        // Get equipment IDs that have cameras (to filter out camera-attached IoT devices later)
        const cameraEquipmentIds = cameraData?.map((cam: any) => cam.equipment?.id) || [];

        if (cameraData) {
          // Fetch camera details from unified hardware_master
          const { data: hardwareMaster } = await supabase
            .from('hardware_master')
            .select('*')
            .eq('hardware_type', 'Camera');

          cameraData.forEach((cam: any) => {
            const line = lines?.find(l => l.id === cam.equipment?.solutions_line_id);
            const master = hardwareMaster?.find(m => m.id === cam.camera_type);
            
            if (line) {
              allHardware.push({
                id: `camera-${cam.id}`,
                hardware_type: `Camera - ${master?.product_name || cam.camera_type || 'Unknown'}`,
                source: 'line',
                line_name: line.line_name,
                equipment_name: cam.equipment?.name,
                quantity: 1,
                sku_no: master?.sku_no,
                model_number: master?.sku_no,
                description: master?.description,
                price: master?.price_gbp,
              });
            }
          });
        }

        // ============= IOT DEVICES FROM LINES (EXCLUDE CAMERA-ATTACHED ITEMS) =============
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
              hardware_type,
              type,
              description,
              price_gbp
            )
          `)
          .in('equipment.solutions_line_id', lineIds);

        if (iotData) {
          iotData.forEach((device: any) => {
            // Skip IoT devices that are attached to camera equipment (lights, PLCs, HMIs)
            if (cameraEquipmentIds.includes(device.equipment?.id)) {
              return;
            }

            const line = lines?.find(l => l.id === device.equipment?.solutions_line_id);
            const master = device.hardware_master;
            
            if (line) {
              allHardware.push({
                id: `iot-${device.id}`,
                hardware_type: `${master?.hardware_type || master?.type || 'Hardware'}`,
                source: 'line',
                line_name: line.line_name,
                equipment_name: device.equipment?.name,
                quantity: 1,
                sku_no: master?.sku_no,
                model_number: master?.sku_no,
                description: master?.description || master?.product_name,
                price: master?.price_gbp,
              });
            }
          });
        }
      }

      // ============= DIRECT HARDWARE (project_iot_requirements) =============
      const { data: iotRequirements } = await supabase
        .from('project_iot_requirements')
        .select(`
          id,
          hardware_type,
          name,
          quantity,
          gateway_id,
          receiver_id,
          hardware_master_id
        `)
        .eq('solutions_project_id', solutionsProjectId);

      if (iotRequirements && iotRequirements.length > 0) {
        // Fetch gateways master data
        const gatewayIds = iotRequirements
          .filter(req => req.gateway_id)
          .map(req => req.gateway_id);
        
        let gatewaysMap = new Map();
        if (gatewayIds.length > 0) {
          const { data: gateways } = await supabase
            .from('gateways_master')
            .select('*')
            .in('id', gatewayIds);
          
          gateways?.forEach(gw => gatewaysMap.set(gw.id, gw));
        }

        // Fetch receivers master data
        const receiverIds = iotRequirements
          .filter(req => req.receiver_id)
          .map(req => req.receiver_id);
        
        let receiversMap = new Map();
        if (receiverIds.length > 0) {
          const { data: receivers } = await supabase
            .from('receivers_master')
            .select('*')
            .in('id', receiverIds);
          
          receivers?.forEach(rcv => receiversMap.set(rcv.id, rcv));
        }

        // Fetch hardware master data
        const hardwareIds = iotRequirements
          .filter(req => req.hardware_master_id)
          .map(req => req.hardware_master_id);
        
        let hardwareMap = new Map();
        if (hardwareIds.length > 0) {
          const { data: hardwareMaster } = await supabase
            .from('hardware_master')
            .select('*')
            .in('id', hardwareIds);
          
          hardwareMaster?.forEach(hw => hardwareMap.set(hw.id, hw));
        }

        // Process each requirement
        iotRequirements.forEach((req: any) => {
          let master: any = null;
          let hardwareType = req.hardware_type || 'Unknown';
          let itemName = req.name || 'Unknown';

          if (req.gateway_id) {
            master = gatewaysMap.get(req.gateway_id);
            hardwareType = 'Gateway';
            itemName = master?.model_number || req.name || 'Gateway';
          } else if (req.receiver_id) {
            master = receiversMap.get(req.receiver_id);
            hardwareType = 'Receiver';
            itemName = master?.model_number || req.name || 'Receiver';
          } else if (req.hardware_master_id) {
            master = hardwareMap.get(req.hardware_master_id);
            hardwareType = master?.type || master?.hardware_type || req.hardware_type || 'Hardware';
            itemName = master?.product_name || req.name || 'Hardware';
          }

          allHardware.push({
            id: `direct-${req.id}`,
            hardware_type: `${hardwareType} - ${itemName}`,
            source: 'direct',
            quantity: req.quantity || 1,
            sku_no: master?.sku_no || master?.model_number,
            manufacturer: master?.manufacturer,
            model_number: master?.model_number || master?.sku_no,
            description: master?.description,
            price: master?.price || master?.price_gbp,
            supplier_name: master?.supplier_name,
            supplier_person: master?.supplier_person,
            supplier_email: master?.supplier_email,
            supplier_phone: master?.supplier_phone,
            order_hyperlink: master?.order_hyperlink,
          });
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

  return { hardware, loading, refetch: fetchAllHardware };
};
