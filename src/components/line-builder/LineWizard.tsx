import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LineBasicInfo } from "./steps/LineBasicInfo";
import { ProcessFlowBuilder } from "./steps/ProcessFlowBuilder";
import { EquipmentTitles } from "./steps/EquipmentTitles";
import { DeviceAssignment } from "./steps/DeviceAssignment";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Position {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  titles: Array<{ id: string; title: "RLE" | "OP" }>;
  equipment: Equipment[];
}

interface Equipment {
  id: string;
  name: string;
  equipment_type?: string;
  cameras: Array<{
    id: string;
    name: string;
    camera_type: string;
    lens_type: string;
    light_required?: boolean;
    light_id?: string;
    light_notes?: string;
    plc_attached?: boolean;
    plc_master_id?: string;
    relay_outputs?: Array<{
      id: string;
      output_number: number;
      type: string;
      custom_name: string;
      notes: string;
    }>;
    hmi_required?: boolean;
    hmi_master_id?: string;
    hmi_notes?: string;
    horizontal_fov?: string;
    working_distance?: string;
    smallest_text?: string;
    use_case_ids?: string[];
    use_case_description?: string;
    attributes?: Array<{
      id: string;
      title: string;
      description: string;
    }>;
    product_flow?: string;
    camera_view_description?: string;
  }>;
  iot_devices: Array<{
    id: string;
    name: string;
    hardware_master_id: string;
    receiver_master_id?: string;
  }>;
}

interface LineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onComplete: () => void;
  editLineId?: string;
}

export const LineWizard: React.FC<LineWizardProps> = ({
  open,
  onOpenChange,
  projectId,
  onComplete,
  editLineId,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [lineData, setLineData] = useState({
    name: "",
    min_speed: 0,
    max_speed: 0,
    line_description: "",
    product_description: "",
    photos_url: "",
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setLineData({ name: "", min_speed: 0, max_speed: 0, line_description: "", product_description: "", photos_url: "" });
      setPositions([]);
    } else if (editLineId) {
      loadLineData();
    }
  }, [open, editLineId]);

  const loadLineData = async () => {
    if (!editLineId) return;

    try {
      // Load line data
      const { data: lineData, error: lineError } = await supabase
        .from('lines')
        .select('*')
        .eq('id', editLineId)
        .single();

      if (lineError) throw lineError;

      setLineData({
        name: lineData.line_name,
        min_speed: lineData.min_speed || 0,
        max_speed: lineData.max_speed || 0,
        line_description: lineData.line_description || "",
        product_description: lineData.product_description || "",
        photos_url: lineData.photos_url || "",
      });

      // Load positions with titles
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select(`
          *,
          position_titles(title)
        `)
        .eq('line_id', editLineId)
        .order('position_x');

      if (positionsError) throw positionsError;

      // Load equipment for each position
      const formattedPositions = await Promise.all(positionsData.map(async (pos) => {
        const { data: equipmentData } = await supabase
          .from('equipment')
          .select(`
            *,
            cameras(*),
            iot_devices(*)
          `)
          .eq('position_id', pos.id);

        // Load equipment with all camera ancillary data
        const equipmentWithOutputs = await Promise.all(
          (equipmentData || []).map(async (eq: any) => {
            const camerasWithFullData = await Promise.all(
              (eq.cameras || []).map(async (cam: any) => {
                // Fetch all camera-related data in parallel
                const [outputs, measurements, useCases, attributes, views] = await Promise.all([
                  supabase.from('camera_plc_outputs')
                    .select('id, output_number, type, custom_name, notes')
                    .eq('camera_id', cam.id)
                    .order('output_number'),
                  supabase.from('camera_measurements')
                    .select('*')
                    .eq('camera_id', cam.id)
                    .maybeSingle(),
                  supabase.from('camera_use_cases')
                    .select('vision_use_case_id, description')
                    .eq('camera_id', cam.id),
                  supabase.from('camera_attributes')
                    .select('*')
                    .eq('camera_id', cam.id)
                    .order('order_index'),
                  supabase.from('camera_views')
                    .select('*')
                    .eq('camera_id', cam.id)
                    .maybeSingle(),
                ]);
                
                return {
                  id: cam.id,
                  name: cam.mac_address || "Unnamed Camera",
                  camera_type: cam.camera_type,
                  lens_type: cam.lens_type,
                  light_required: cam.light_required || false,
                  light_id: cam.light_id || undefined,
                  plc_attached: cam.plc_attached || false,
                  plc_master_id: cam.plc_master_id || undefined,
                  hmi_required: cam.hmi_required || false,
                  hmi_master_id: cam.hmi_master_id || undefined,
                  relay_outputs: outputs.data || [],
                  horizontal_fov: measurements.data?.horizontal_fov?.toString() || "",
                  working_distance: measurements.data?.working_distance?.toString() || "",
                  smallest_text: measurements.data?.smallest_text || "",
                  use_case_ids: useCases.data?.map(uc => uc.vision_use_case_id) || [],
                  use_case_description: useCases.data?.[0]?.description || "",
                  attributes: attributes.data?.map(attr => ({
                    id: attr.id,
                    title: attr.title,
                    description: attr.description || ""
                  })) || [],
                  product_flow: views.data?.product_flow || "",
                  camera_view_description: views.data?.description || "",
                };
              })
            );

            return {
              id: eq.id,
              name: eq.name,
              equipment_type: eq.equipment_type,
              cameras: camerasWithFullData,
              iot_devices: (eq.iot_devices || []).map((iot: any) => ({
                id: iot.id,
                name: iot.name || "Unnamed Device",
                hardware_master_id: iot.hardware_master_id || "",
                receiver_master_id: iot.receiver_master_id || ""
              }))
            };
          })
        );

        return {
          id: pos.id,
          name: pos.name,
          position_x: pos.position_x,
          position_y: pos.position_y,
          titles: pos.position_titles?.map((pt: any, index: number) => ({ 
            id: `${pt.title}-${index}`, 
            title: pt.title as "RLE" | "OP" 
          })) || [],
          equipment: equipmentWithOutputs
        };
      }));

      setPositions(formattedPositions);
    } catch (error) {
      console.error('Error loading line data:', error);
      toast({
        title: "Error",
        description: "Failed to load line data",
        variant: "destructive",
      });
    }
  };

  const steps = [
    { id: 1, title: "Basic Info", component: LineBasicInfo },
    { id: 2, title: "Process Flow", component: ProcessFlowBuilder },
    { id: 3, title: "Position Titles", component: EquipmentTitles },
    { id: 4, title: "Devices", component: DeviceAssignment },
  ];

  const progress = (currentStep / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Calculate totals
      const totalCameras = positions.reduce(
        (acc, pos) => acc + pos.equipment.reduce((eqAcc, eq) => eqAcc + eq.cameras.length, 0), 
        0
      );
      const totalIotDevices = positions.reduce(
        (acc, pos) => acc + pos.equipment.reduce((eqAcc, eq) => eqAcc + eq.iot_devices.length, 0), 
        0
      );

      let currentLineId = editLineId;

      if (editLineId) {
        // Update existing line
        const { error: lineError } = await supabase
          .from('lines')
          .update({
            line_name: lineData.name,
            min_speed: lineData.min_speed,
            max_speed: lineData.max_speed,
            camera_count: totalCameras,
            iot_device_count: totalIotDevices,
            line_description: lineData.line_description || null,
            product_description: lineData.product_description || null,
          })
          .eq('id', editLineId);

        if (lineError) throw lineError;

        // Delete existing related data - cascade properly
        const { data: existingEquipment } = await supabase
          .from('equipment')
          .select('id, cameras(id)')
          .eq('line_id', editLineId);

        if (existingEquipment?.length) {
          const equipmentIds = existingEquipment.map(e => e.id);
          
          // Get all camera IDs to delete their ancillary data
          const cameraIds = existingEquipment
            .flatMap(e => (e.cameras as any[]) || [])
            .map(c => c.id);
          
          if (cameraIds.length > 0) {
            // Delete camera ancillary data first
            await Promise.all([
              supabase.from('camera_measurements').delete().in('camera_id', cameraIds),
              supabase.from('camera_use_cases').delete().in('camera_id', cameraIds),
              supabase.from('camera_attributes').delete().in('camera_id', cameraIds),
              supabase.from('camera_views').delete().in('camera_id', cameraIds),
              supabase.from('camera_plc_outputs').delete().in('camera_id', cameraIds),
            ]);
          }
          
          // Now delete cameras and iot devices
          await supabase.from('cameras').delete().in('equipment_id', equipmentIds);
          await supabase.from('iot_devices').delete().in('equipment_id', equipmentIds);
        }

        const { data: existingPositions } = await supabase
          .from('positions')
          .select('id')
          .eq('line_id', editLineId);

        if (existingPositions?.length) {
          const positionIds = existingPositions.map(p => p.id);
          await supabase.from('position_titles').delete().in('position_id', positionIds);
        }

        await supabase.from('equipment').delete().eq('line_id', editLineId);
        await supabase.from('positions').delete().eq('line_id', editLineId);
      } else {
        // Create new line
        const { data: lineResult, error: lineError } = await supabase
          .from("lines")
          .insert({
            project_id: projectId,
            line_name: lineData.name,
            min_speed: lineData.min_speed,
            max_speed: lineData.max_speed,
            camera_count: totalCameras,
            iot_device_count: totalIotDevices,
            line_description: lineData.line_description || null,
            product_description: lineData.product_description || null,
          })
          .select()
          .single();

        if (lineError) throw lineError;
        currentLineId = lineResult.id;
      }

      // Create positions and equipment
      for (const position of positions) {
        const { data: positionData, error: positionError } = await supabase
          .from('positions')
          .insert({
            line_id: currentLineId,
            name: position.name,
            position_x: Math.round(position.position_x),
            position_y: Math.round(position.position_y)
          })
          .select()
          .single();

        if (positionError) throw positionError;

        // Create position titles
        for (const title of position.titles) {
          await supabase
            .from('position_titles')
            .insert({
              position_id: positionData.id,
              title: title.title
            });
        }

        // Create equipment for this position
        for (const eq of position.equipment) {
          const { data: equipmentData, error: equipmentError } = await supabase
            .from('equipment')
            .insert({
              line_id: currentLineId,
              position_id: positionData.id,
              name: eq.name,
              equipment_type: eq.equipment_type || "Machine"
            })
            .select()
            .single();

          if (equipmentError) throw equipmentError;

          // Create cameras for this equipment
          for (const camera of eq.cameras) {
            const { data: cameraData, error: cameraError } = await supabase
              .from('cameras')
              .insert({
                equipment_id: equipmentData.id,
                camera_type: camera.camera_type,
                lens_type: camera.lens_type,
                mac_address: camera.name || '',
                light_required: camera.light_required || false,
                light_id: camera.light_id || null,
                plc_attached: camera.plc_attached || false,
                plc_master_id: camera.plc_master_id || null,
                hmi_required: camera.hmi_required || false,
                hmi_master_id: camera.hmi_master_id || null,
              })
              .select()
              .single();
            
            if (cameraError) throw cameraError;

            // Create measurements if provided
            if (camera.horizontal_fov || camera.working_distance || camera.smallest_text) {
              await supabase
                .from('camera_measurements')
                .insert({
                  camera_id: cameraData.id,
                  horizontal_fov: camera.horizontal_fov ? parseFloat(camera.horizontal_fov) : null,
                  working_distance: camera.working_distance ? parseFloat(camera.working_distance) : null,
                  smallest_text: camera.smallest_text || null,
                });
            }

            // Create use cases if provided
            if (camera.use_case_ids && camera.use_case_ids.length > 0) {
              await supabase
                .from('camera_use_cases')
                .insert(camera.use_case_ids.map(useCaseId => ({
                  camera_id: cameraData.id,
                  vision_use_case_id: useCaseId,
                  description: camera.use_case_description || null,
                })));
            }

            // Create attributes if provided
            if (camera.attributes && camera.attributes.length > 0) {
              await supabase
                .from('camera_attributes')
                .insert(camera.attributes.map((attr, index) => ({
                  camera_id: cameraData.id,
                  title: attr.title,
                  description: attr.description || null,
                  order_index: index,
                })));
            }

            // Create camera view if provided
            if (camera.product_flow || camera.camera_view_description) {
              await supabase
                .from('camera_views')
                .insert({
                  camera_id: cameraData.id,
                  product_flow: camera.product_flow || null,
                  description: camera.camera_view_description || null,
                });
            }

            // Create relay outputs for this camera
            if (camera.relay_outputs && camera.relay_outputs.length > 0) {
              await supabase
                .from('camera_plc_outputs')
                .insert(camera.relay_outputs.map(output => ({
                  camera_id: cameraData.id,
                  output_number: output.output_number,
                  type: output.type,
                  custom_name: output.custom_name,
                  notes: output.notes
                })));
            }
          }

          // Create IoT devices for this equipment (excluding camera accessories)
          for (const iot of eq.iot_devices) {
            await supabase
              .from('iot_devices')
              .insert({
                equipment_id: equipmentData.id,
                name: iot.name,
                hardware_master_id: iot.hardware_master_id,
                receiver_master_id: iot.receiver_master_id || null,
                mac_address: '',
                receiver_mac_address: ''
              });
          }
        }
      }

      toast({
        title: "Success",
        description: editLineId ? "Line updated successfully" : "Line created successfully with all positions, equipment and devices.",
      });

      onComplete();
      onOpenChange(false);
      
      // Reset state
      setCurrentStep(1);
      setLineData({ name: "", min_speed: 0, max_speed: 0, line_description: "", product_description: "", photos_url: "" });
      setPositions([]);

    } catch (error) {
      console.error("Error creating line:", error);
      toast({
        title: "Error",
        description: "Failed to create line. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editLineId ? "Edit Production Line" : "Create New Production Line"}</DialogTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {currentStep === 1 && <LineBasicInfo lineData={lineData} setLineData={setLineData} />}
          {currentStep === 2 && <ProcessFlowBuilder positions={positions} setPositions={setPositions} />}
          {currentStep === 3 && <EquipmentTitles positions={positions} setPositions={setPositions} />}
          {currentStep === 4 && <DeviceAssignment positions={positions} setPositions={setPositions} />}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>

          {currentStep === steps.length ? (
            <Button onClick={handleComplete}>
              Complete Setup
            </Button>
          ) : (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};