import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HardwareItem {
  id: string;
  hardware_type: string;
  category?: string;
  source: 'direct' | 'line';
  line_name?: string;
  equipment_name?: string;
  quantity: number;
  sku_no?: string;
  manufacturer?: string;
  model_number?: string;
  description?: string;
  price?: number;
  hardware_master_id?: string;
  override_price?: number;
  effective_price?: number;
  invoice_status?: 'not_raised' | 'raised' | 'received';
  supplier_name?: string;
  supplier_person?: string;
  supplier_email?: string;
  supplier_phone?: string;
  order_hyperlink?: string;
}
export const useProjectHardwareSummary = (projectId: string) => {
  const [hardware, setHardware] = useState<HardwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllHardware();
  }, [projectId]);

  const fetchAllHardware = async () => {
    try {
      setLoading(true);
      const allHardware: HardwareItem[] = [];

      // Get all line IDs for this project
      const { data: lines } = await supabase
        .from('lines')
        .select('id, line_name')
        .eq('project_id', projectId);

      const lineIds = lines?.map(l => l.id) || [];

      // ============= CAMERAS FROM LINES =============
      if (lineIds.length > 0) {
        const { data: cameraData } = await supabase
          .from('cameras')
          .select(`
            id,
            camera_type,
            light_id,
            plc_master_id,
            hmi_master_id,
            equipment!inner(
              id,
              name,
              line_id
            )
          `)
          .in('equipment.line_id', lineIds);

        if (cameraData) {
          // Fetch camera details from unified hardware_master
          const { data: hardwareMaster } = await supabase
            .from('hardware_master')
            .select('*')
            .eq('hardware_type', 'Camera');

          // Collect all light, PLC, and HMI IDs
          const lightIds = [...new Set(cameraData.filter(c => c.light_id).map(c => c.light_id))];
          const plcIds = [...new Set(cameraData.filter(c => c.plc_master_id).map(c => c.plc_master_id))];
          const hmiIds = [...new Set(cameraData.filter(c => c.hmi_master_id).map(c => c.hmi_master_id))];

          // Fetch all accessory master data
          let accessoryMasterData: any[] = [];
          if ([...lightIds, ...plcIds, ...hmiIds].length > 0) {
            const { data } = await supabase
              .from('hardware_master')
              .select('*')
              .in('id', [...lightIds, ...plcIds, ...hmiIds]);
            accessoryMasterData = data || [];
          }

          cameraData.forEach((cam: any) => {
            const line = lines?.find(l => l.id === cam.equipment?.line_id);
            const master = hardwareMaster?.find(m => m.id === cam.camera_type);
            
            if (line) {
              // Add camera
          allHardware.push({
            id: `camera-${cam.id}`,
            hardware_type: `Camera - ${master?.product_name || cam.camera_type || 'Unknown'}`,
            category: master?.hardware_type || 'Camera',
            source: 'line',
            line_name: line.line_name,
            equipment_name: cam.equipment?.name,
            quantity: 1,
            sku_no: master?.sku_no,
            model_number: master?.sku_no,
            description: master?.description,
            hardware_master_id: master?.id,
            price: master?.rrp_gbp ?? master?.price_gbp,
          });
              // Add light if attached
              if (cam.light_id) {
                const lightMaster = accessoryMasterData.find(m => m.id === cam.light_id);
                if (lightMaster) {
                  allHardware.push({
                    id: `light-${cam.id}`,
                    hardware_type: `Light - ${lightMaster.product_name || 'Unknown'}`,
                    category: lightMaster.hardware_type || 'Light',
                    source: 'line',
                    line_name: line.line_name,
                    equipment_name: cam.equipment?.name,
                    quantity: 1,
                    sku_no: lightMaster.sku_no,
                    model_number: lightMaster.sku_no,
                    manufacturer: lightMaster.manufacturer,
                    description: lightMaster.description,
                    hardware_master_id: lightMaster.id,
                    price: lightMaster.rrp_gbp ?? lightMaster.price_gbp,
                    supplier_name: lightMaster.supplier_name,
                    supplier_person: lightMaster.supplier_person,
                    supplier_email: lightMaster.supplier_email,
                    supplier_phone: lightMaster.supplier_phone,
                    order_hyperlink: lightMaster.order_hyperlink,
                  });
                }
              }

              // Add PLC if attached
              if (cam.plc_master_id) {
                const plcMaster = accessoryMasterData.find(m => m.id === cam.plc_master_id);
                if (plcMaster) {
                  allHardware.push({
                    id: `plc-${cam.id}`,
                    hardware_type: `PLC - ${plcMaster.product_name || 'Unknown'}`,
                    category: plcMaster.hardware_type || 'PLC',
                    source: 'line',
                    line_name: line.line_name,
                    equipment_name: cam.equipment?.name,
                    quantity: 1,
                    sku_no: plcMaster.sku_no,
                    model_number: plcMaster.sku_no,
                    manufacturer: plcMaster.manufacturer,
                    description: plcMaster.description,
                    hardware_master_id: plcMaster.id,
                    price: plcMaster.rrp_gbp ?? plcMaster.price_gbp,
                    supplier_name: plcMaster.supplier_name,
                    supplier_person: plcMaster.supplier_person,
                    supplier_email: plcMaster.supplier_email,
                    supplier_phone: plcMaster.supplier_phone,
                    order_hyperlink: plcMaster.order_hyperlink,
                  });
                }
              }

              // Add HMI if attached
              if (cam.hmi_master_id) {
                const hmiMaster = accessoryMasterData.find(m => m.id === cam.hmi_master_id);
                if (hmiMaster) {
                  allHardware.push({
                    id: `hmi-${cam.id}`,
                    hardware_type: `HMI - ${hmiMaster.product_name || 'Unknown'}`,
                    category: hmiMaster.hardware_type || 'HMI',
                    source: 'line',
                    line_name: line.line_name,
                    equipment_name: cam.equipment?.name,
                    quantity: 1,
                    sku_no: hmiMaster.sku_no,
                    model_number: hmiMaster.sku_no,
                    manufacturer: hmiMaster.manufacturer,
                    description: hmiMaster.description,
                    hardware_master_id: hmiMaster.id,
                    price: hmiMaster.rrp_gbp ?? hmiMaster.price_gbp,
                    supplier_name: hmiMaster.supplier_name,
                    supplier_person: hmiMaster.supplier_person,
                    supplier_email: hmiMaster.supplier_email,
                    supplier_phone: hmiMaster.supplier_phone,
                    order_hyperlink: hmiMaster.order_hyperlink,
                  });
                }
              }
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
              line_id
            ),
            hardware_master(
              id,
              sku_no,
              product_name,
              hardware_type,
              type,
              description,
              price_gbp,
              rrp_gbp
            )
          `)
          .in('equipment.line_id', lineIds);

        if (iotData) {
          iotData.forEach((device: any) => {
            const line = lines?.find(l => l.id === device.equipment?.line_id);
            const master = device.hardware_master;
            
            if (line) {
              allHardware.push({
                id: `iot-${device.id}`,
                hardware_type: `${master?.hardware_type || master?.type || 'Hardware'}`,
                category: master?.hardware_type || 'Hardware',
                source: 'line',
                line_name: line.line_name,
                equipment_name: device.equipment?.name,
                quantity: 1,
                sku_no: master?.sku_no,
                model_number: master?.sku_no,
                description: master?.description || master?.product_name,
                hardware_master_id: master?.id,
                price: master?.rrp_gbp ?? master?.price_gbp,
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
        .eq('project_id', projectId);

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
          let category = req.hardware_type || 'Unknown';
          let itemName = req.name || 'Unknown';
          let unitPrice: number | undefined;
 
          if (req.gateway_id) {
            master = gatewaysMap.get(req.gateway_id);
            hardwareType = 'Gateway';
            category = 'Gateway';
            itemName = master?.model_number || req.name || 'Gateway';
            unitPrice = master?.price ?? master?.price_gbp;
          } else if (req.receiver_id) {
            master = receiversMap.get(req.receiver_id);
            hardwareType = 'Receiver';
            category = 'Receiver';
            itemName = master?.model_number || req.name || 'Receiver';
            unitPrice = master?.price ?? master?.price_gbp;
          } else if (req.hardware_master_id) {
            master = hardwareMap.get(req.hardware_master_id);
            hardwareType = master?.hardware_type || req.hardware_type || 'Hardware';
            category = master?.hardware_type || req.hardware_type || 'Hardware';
            itemName = master?.product_name || req.name || 'Hardware';
            unitPrice = master?.rrp_gbp ?? master?.price_gbp;
          }
 
          const count = req.quantity || 1;
 
          for (let i = 0; i < count; i++) {
            allHardware.push({
              id: `direct-${req.id}-${i + 1}`,
              hardware_type: `${hardwareType} - ${itemName}`,
              category: category,
              source: 'direct',
              quantity: 1,
              sku_no: master?.sku_no || master?.model_number,
              manufacturer: master?.manufacturer,
              model_number: master?.model_number || master?.sku_no,
              description: master?.description,
              hardware_master_id: req.hardware_master_id,
              price: unitPrice,
              supplier_name: master?.supplier_name,
              supplier_person: master?.supplier_person,
              supplier_email: master?.supplier_email,
              supplier_phone: master?.supplier_phone,
              order_hyperlink: master?.order_hyperlink,
            });
          }
        });
      }

      const hardwareMasterIdsSet = new Set<string>();
      allHardware.forEach(item => {
        if (item.hardware_master_id) {
          hardwareMasterIdsSet.add(item.hardware_master_id);
        }
      });
      const hardwareMasterIds = Array.from(hardwareMasterIdsSet);

      const overridesMap = new Map<string, number>();
      const invoiceStatusMap = new Map<string, 'not_raised' | 'raised' | 'received'>();

      if (hardwareMasterIds.length > 0) {
        const { data: overrides, error: overridesError } = await (supabase
          .from('project_hardware_prices' as any)
          .select('hardware_master_id, price_gbp')
          .eq('project_id', projectId)
          .in('hardware_master_id', hardwareMasterIds));

        if (overridesError) {
          console.error('Error fetching project hardware price overrides:', overridesError);
        } else if (overrides) {
          overrides.forEach((row: any) => {
            if (row.price_gbp != null) {
              overridesMap.set(row.hardware_master_id, Number(row.price_gbp));
            }
          });
        }

        const { data: invoiceRows, error: invoiceError } = await (supabase
          .from('project_hardware_invoice_status' as any)
          .select('hardware_master_id, invoice_status')
          .eq('project_id', projectId)
          .in('hardware_master_id', hardwareMasterIds));

        if (invoiceError) {
          console.error('Error fetching project hardware invoice status:', invoiceError);
        } else if (invoiceRows) {
          invoiceRows.forEach((row: any) => {
            if (row.invoice_status) {
              invoiceStatusMap.set(
                row.hardware_master_id,
                row.invoice_status as 'not_raised' | 'raised' | 'received',
              );
            }
          });
        }
      }

      const hardwareWithOverrides = allHardware.map(item => {
        const override = item.hardware_master_id
          ? overridesMap.get(item.hardware_master_id)
          : undefined;

        const invoiceStatus: 'not_raised' | 'raised' | 'received' = item.hardware_master_id
          ? invoiceStatusMap.get(item.hardware_master_id) ?? 'not_raised'
          : 'not_raised';

        return {
          ...item,
          override_price: override,
          effective_price: override ?? item.price,
          invoice_status: invoiceStatus,
        };
      });

      setHardware(hardwareWithOverrides);
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
