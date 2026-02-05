import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { useSaveWithRetry } from "./useSaveWithRetry";

interface Camera {
  id: string;
  name: string;
  camera_ip?: string;
  camera_type: string;
  lens_type: string;
  light_required?: boolean;
  light_id?: string;
  plc_master_id?: string;
  hmi_master_id?: string;
  measurements?: {
    horizontal_fov?: string;
    working_distance?: string;
    smallest_text?: string;
  };
  use_cases?: Array<{
    id: string;
    vision_use_case_id: string;
    use_case_name: string;
    description?: string;
  }>;
  attributes?: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  camera_view?: {
    product_flow?: string;
    description?: string;
  };
}

interface IoTDevice {
  id: string;
  name: string;
  hardware_master_id?: string;
  receiver_name?: string;
}

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  cameras: Camera[];
  iot_devices: IoTDevice[];
}

interface Position {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  titles: PositionTitle[];
  equipment: Equipment[];
}

interface PositionTitle {
  id: string;
  title: "RLE" | "OP";
}

interface LineData {
  id: string;
  line_name: string;
  min_speed?: number;
  max_speed?: number;
  positions: Position[];
}

export const useLineVisualization = (lineId: string) => {
  const [editingCamera, setEditingCamera] = useState<(Camera & { positionName: string; equipmentName: string }) | null>(null);
  const [editingIoT, setEditingIoT] = useState<IoTDevice & { positionName: string; equipmentName: string } | null>(null);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraFormData, setCameraFormData] = useState<any>(null);
  const [receivers, setReceivers] = useState<Array<{ id: string; name: string }>>([]);
  
  const { toast } = useToast();
  const masterData = useMasterDataCache();
  
  // Save hooks
  const { 
    isSaving: isSavingCamera, 
    executeTransactionalSave: saveCamera,
    retryCount: cameraRetryCount
  } = useSaveWithRetry();
  
  const { 
    isSaving: isSavingIoT, 
    executeWithRetry: saveIoT,
    retryCount: iotRetryCount
  } = useSaveWithRetry();

  // Fetch line data with TanStack Query caching
  const { data: lineData, isLoading: loading, refetch: refetchLineData } = useQuery({
    queryKey: ['line-visualization', lineId],
    queryFn: async () => {
      // First, determine if this is a solutions line or implementation line
      const { data: solutionsLine } = await supabase
        .from('solutions_lines')
        .select('id')
        .eq('id', lineId)
        .maybeSingle();

      const isSolutionsLine = !!solutionsLine;
      const tableName = isSolutionsLine ? 'solutions_lines' : 'lines';

      // Use optimized RPC function to fetch all data in a single query
      const { data, error } = await supabase.rpc('get_line_full_data', {
        p_input_line_id: lineId,
        p_table_name: tableName
      });

      if (error) throw error;
      if (!data) throw new Error('Line not found');

      // Parse the returned JSON structure
      const result = data as any;
      const lineInfo = result.lineData;
      
      // Prepare vision accessory master IDs to filter IoT list
      const { data: visionMaster } = await supabase
        .from('hardware_master')
        .select('id, hardware_type')
        .in('hardware_type', ['Light','PLC','HMI']);
      const visionAccessoryIds = new Set((visionMaster || []).map((h: any) => h.id));

      // Transform positions to match expected structure
      const transformedPositions = (result.positions || []).map((pos: any) => ({
        id: pos.id,
        name: pos.name,
        position_x: pos.position_x,
        position_y: pos.position_y,
        titles: (pos.position_titles || []).map((pt: any) => ({
          id: pt.id,
          title: pt.title as "RLE" | "OP"
        })),
        equipment: (pos.equipment || []).map((eq: any) => ({
          id: eq.id,
          name: eq.name,
          equipment_type: eq.equipment_type || "",
          cameras: (eq.cameras || []).map((cam: any) => ({
            id: cam.id,
            name: cam.name || "Unnamed Camera",
            camera_type: cam.camera_type,
            lens_type: cam.lens_type,
            light_required: cam.light_required || false,
            light_id: cam.light_id || undefined,
            plc_master_id: cam.plc_master_id || undefined,
            hmi_master_id: cam.hmi_master_id || undefined,
            measurements: cam.horizontal_fov || cam.working_distance || cam.smallest_text ? {
              horizontal_fov: cam.horizontal_fov || undefined,
              working_distance: cam.working_distance || undefined,
              smallest_text: cam.smallest_text || undefined
            } : undefined,
            use_cases: (cam.use_case_ids || []).map((ucId: string, idx: number) => ({
              id: `${cam.id}-uc-${idx}`,
              vision_use_case_id: ucId,
              use_case_name: '',
              description: cam.use_case_description || undefined
            })),
            attributes: cam.attributes || [],
            camera_view: cam.product_flow || cam.camera_view_description ? {
              product_flow: cam.product_flow || undefined,
              description: cam.camera_view_description || undefined
            } : undefined
          })),
          iot_devices: (eq.iot_devices || [])
            .filter((d: any) => !visionAccessoryIds.has(d.hardware_master_id))
            .map((iot: any) => ({
              id: iot.id,
              name: iot.name,
              hardware_master_id: iot.hardware_master_id,
              receiver_mac_address: iot.receiver_mac_address
            }))
        }))
      }));

      return {
        id: lineId,
        line_name: lineInfo.name,
        min_speed: lineInfo.min_speed,
        max_speed: lineInfo.max_speed,
        positions: transformedPositions
      };
    },
    staleTime: 0, // Always refetch on mount - line data changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for quick back navigation
    refetchOnMount: 'always', // Force refetch when component mounts
  });

  useEffect(() => {
    fetchReceivers();
  }, [lineId, lineData]);

  const fetchReceivers = async () => {
    if (!lineData) return;
    
    // Try to get solutions_project_id from the line
    const { data: solutionsLine } = await supabase
      .from('solutions_lines')
      .select('solutions_project_id')
      .eq('id', lineId)
      .maybeSingle();

    if (solutionsLine?.solutions_project_id) {
      const { data } = await supabase
        .from('project_iot_requirements')
        .select('id, name')
        .eq('solutions_project_id', solutionsLine.solutions_project_id)
        .eq('hardware_type', 'receiver');
      setReceivers(data || []);
    }
  };

  const handleEditCamera = (camera: any, positionName: string, equipmentName: string) => {
    setCameraFormData({
      name: camera.name || "",
      camera_ip: camera.camera_ip || "",
      camera_type: camera.camera_type || "",
      lens_type: camera.lens_type || "",
      light_required: camera.light_required || false,
      light_id: camera.light_id || "",
      light_notes: camera.light_notes || "",
      plc_attached: !!camera.plc_master_id,
      plc_master_id: camera.plc_master_id || "",
      relay_outputs: [],
      hmi_required: !!camera.hmi_master_id,
      hmi_master_id: camera.hmi_master_id || "",
      hmi_notes: camera.hmi_notes || "",
      horizontal_fov: camera.measurements?.horizontal_fov || "",
      working_distance: camera.measurements?.working_distance || "",
      smallest_text: camera.measurements?.smallest_text || "",
      use_case_ids: camera.use_cases?.map((uc: any) => uc.vision_use_case_id) || [],
      use_case_description: camera.use_cases?.[0]?.description || "",
      attributes: camera.attributes || [],
      product_flow: camera.camera_view?.product_flow || "",
      camera_view_description: camera.camera_view?.description || "",
    });
    setEditingCamera({ ...camera, positionName, equipmentName });
    setCameraDialogOpen(true);
  };

  const handleCameraSave = async (formData: any) => {
    if (!editingCamera) return;

    // Convert empty strings to null for UUID fields
    const cleanFormData = {
      ...formData,
      light_id: formData.light_id || null,
      plc_master_id: formData.plc_master_id || null,
      hmi_master_id: formData.hmi_master_id || null,
    };

    // Validate use case IDs
    let validatedUseCaseIds: string[] = [];
    if (cleanFormData.use_case_ids && cleanFormData.use_case_ids.length > 0) {
      const { data: validUseCases, error: validateError } = await supabase
        .from('vision_use_cases_master')
        .select('id')
        .in('id', cleanFormData.use_case_ids);

      if (validateError) {
        toast({
          title: "Validation Error",
          description: `Failed to validate use cases: ${validateError.message}`,
          variant: "destructive",
        });
        return;
      }

      const validIds = new Set(validUseCases?.map(uc => uc.id) || []);
      validatedUseCaseIds = cleanFormData.use_case_ids.filter((id: string) => validIds.has(id));
    }

    // Capture original state for rollback
    const { data: originalCamera } = await supabase
      .from('cameras')
      .select('*')
      .eq('id', editingCamera.id)
      .maybeSingle();

    const { data: originalMeasurements } = await supabase
      .from('camera_measurements')
      .select('*')
      .eq('camera_id', editingCamera.id)
      .maybeSingle();

    const { data: originalView } = await supabase
      .from('camera_views')
      .select('*')
      .eq('camera_id', editingCamera.id)
      .maybeSingle();

    const { data: originalUseCases } = await supabase
      .from('camera_use_cases')
      .select('*')
      .eq('camera_id', editingCamera.id);

    const { data: originalAttributes } = await supabase
      .from('camera_attributes')
      .select('*')
      .eq('camera_id', editingCamera.id);

    // Define transactional operations with rollback
    const operations = [
      // 1. Update main camera record
      {
        description: "Update camera details",
        execute: async () => {
          const { error } = await supabase
            .from('cameras')
            .update({
              mac_address: cleanFormData.name || '',
              camera_ip: cleanFormData.camera_ip || null,
              camera_type: cleanFormData.camera_type,
              lens_type: cleanFormData.lens_type || '',
              light_required: cleanFormData.light_required,
              light_id: cleanFormData.light_id || null,
              light_notes: cleanFormData.light_notes || null,
              plc_attached: cleanFormData.plc_attached,
              plc_master_id: cleanFormData.plc_master_id,
              hmi_required: cleanFormData.hmi_required,
              hmi_master_id: cleanFormData.hmi_master_id,
              hmi_notes: cleanFormData.hmi_notes || null,
            })
            .eq('id', editingCamera.id);

          if (error) throw error;
          return { success: true };
        },
        rollback: originalCamera ? async () => {
          await supabase
            .from('cameras')
            .update(originalCamera)
            .eq('id', editingCamera.id);
        } : undefined,
      },

      // 2. Update camera measurements
      {
        description: "Update camera measurements",
        execute: async () => {
          const { error } = await supabase
            .from('camera_measurements')
            .upsert({
              camera_id: editingCamera.id,
              horizontal_fov: parseFloat(cleanFormData.horizontal_fov) || null,
              working_distance: parseFloat(cleanFormData.working_distance) || null,
              smallest_text: cleanFormData.smallest_text || null,
            }, { onConflict: 'camera_id' });

          if (error) throw error;
          return { success: true };
        },
        rollback: async () => {
          if (originalMeasurements) {
            await supabase
              .from('camera_measurements')
              .upsert(originalMeasurements, { onConflict: 'camera_id' });
          } else {
            await supabase
              .from('camera_measurements')
              .delete()
              .eq('camera_id', editingCamera.id);
          }
        },
      },

      // 3. Update camera view
      {
        description: "Update camera view",
        execute: async () => {
          const { error } = await supabase
            .from('camera_views')
            .upsert({
              camera_id: editingCamera.id,
              product_flow: cleanFormData.product_flow || null,
              description: cleanFormData.camera_view_description || null,
            }, { onConflict: 'camera_id' });

          if (error) throw error;
          return { success: true };
        },
        rollback: async () => {
          if (originalView) {
            await supabase
              .from('camera_views')
              .upsert(originalView, { onConflict: 'camera_id' });
          } else {
            await supabase
              .from('camera_views')
              .delete()
              .eq('camera_id', editingCamera.id);
          }
        },
      },

      // 4. Update use cases
      {
        description: "Update camera use cases",
        execute: async () => {
          // Delete existing
          await supabase
            .from('camera_use_cases')
            .delete()
            .eq('camera_id', editingCamera.id);

          // Insert new
          if (validatedUseCaseIds.length > 0) {
            const useCases = validatedUseCaseIds.map((useCaseId: string) => ({
              camera_id: editingCamera.id,
              vision_use_case_id: useCaseId,
              description: cleanFormData.use_case_description || null,
            }));

            const { error } = await supabase
              .from('camera_use_cases')
              .insert(useCases);

            if (error) throw error;
          }
          return { success: true };
        },
        rollback: async () => {
          await supabase
            .from('camera_use_cases')
            .delete()
            .eq('camera_id', editingCamera.id);

          if (originalUseCases && originalUseCases.length > 0) {
            await supabase
              .from('camera_use_cases')
              .insert(originalUseCases);
          }
        },
      },

      // 5. Update attributes
      {
        description: "Update camera attributes",
        execute: async () => {
          // Delete existing
          await supabase
            .from('camera_attributes')
            .delete()
            .eq('camera_id', editingCamera.id);

          // Insert new
          if (cleanFormData.attributes && cleanFormData.attributes.length > 0) {
            const attributes = cleanFormData.attributes.map((attr: any, index: number) => ({
              camera_id: editingCamera.id,
              title: attr.title,
              description: attr.description,
              order_index: index,
            }));

            const { error } = await supabase
              .from('camera_attributes')
              .insert(attributes);

            if (error) throw error;
          }
          return { success: true };
        },
        rollback: async () => {
          await supabase
            .from('camera_attributes')
            .delete()
            .eq('camera_id', editingCamera.id);

          if (originalAttributes && originalAttributes.length > 0) {
            await supabase
              .from('camera_attributes')
              .insert(originalAttributes);
          }
        },
      },
    ];

    // Execute all operations with automatic rollback on failure
    const result = await saveCamera(operations, {
      maxRetries: 3,
      retryDelay: 1000,
      onSuccess: () => {
        setCameraDialogOpen(false);
        setEditingCamera(null);
        refetchLineData();
      },
      onError: (error) => {
        console.error('Camera save failed:', error);
      },
    });

    // Result will be null if save failed after retries and rollback
    if (!result) {
      // Error handling already done by useSaveWithRetry
      return;
    }
  };

  const handleUpdateIoT = async () => {
    if (!editingIoT) return;

    // Capture original state for rollback
    const { data: originalIoT } = await supabase
      .from('iot_devices')
      .select('*')
      .eq('id', editingIoT.id)
      .maybeSingle();

    // Execute with retry and rollback
    const result = await saveIoT({
      description: "Update IoT device",
      execute: async () => {
        const { error } = await supabase
          .from('iot_devices')
          .update({
            name: editingIoT.name,
            hardware_master_id: editingIoT.hardware_master_id,
          })
          .eq('id', editingIoT.id);

        if (error) throw error;
        return { success: true };
      },
      rollback: originalIoT ? async () => {
        await supabase
          .from('iot_devices')
          .update(originalIoT)
          .eq('id', editingIoT.id);
      } : undefined,
    }, {
      maxRetries: 3,
      retryDelay: 1000,
      onSuccess: () => {
        setEditingIoT(null);
        refetchLineData();
      },
      onError: (error) => {
        console.error('IoT device save failed:', error);
      },
    });

    if (!result) {
      // Error handling already done by useSaveWithRetry
      return;
    }
  };

  return {
    // State
    lineData,
    loading,
    editingCamera,
    editingIoT,
    cameraDialogOpen,
    cameraFormData,
    receivers,
    masterData,
    isSavingCamera,
    isSavingIoT,
    cameraRetryCount,
    iotRetryCount,
    
    // Actions
    setEditingCamera,
    setEditingIoT,
    setCameraDialogOpen,
    handleEditCamera,
    handleCameraSave,
    handleUpdateIoT,
    refetchLineData,
  };
};
