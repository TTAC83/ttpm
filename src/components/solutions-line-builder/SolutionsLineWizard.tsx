import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LineBasicInfo } from "@/components/line-builder/steps/LineBasicInfo";
import { ProcessFlowBuilder } from "@/components/line-builder/steps/ProcessFlowBuilder";
import { EquipmentTitles } from "@/components/line-builder/steps/EquipmentTitles";
import { DeviceAssignment } from "@/components/line-builder/steps/DeviceAssignment";
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
  }>;
  iot_devices: Array<{
    id: string;
    name: string;
    hardware_master_id: string;
    receiver_master_id?: string;
  }>;
}

interface SolutionsLineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  solutionsProjectId: string;
  onComplete: () => void;
  editLineId?: string;
}

export const SolutionsLineWizard: React.FC<SolutionsLineWizardProps> = ({
  open,
  onOpenChange,
  solutionsProjectId,
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
  });
  const [positions, setPositions] = useState<Position[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setLineData({ name: "", min_speed: 0, max_speed: 0, line_description: "", product_description: "" });
      setPositions([]);
    } else if (editLineId) {
      loadLineData();
    }
  }, [open, editLineId]);

  const loadLineData = async () => {
    if (!editLineId) return;

    try {
      // Load line data
      const { data: existingLineData, error: lineError } = await supabase
        .from('solutions_lines')
        .select('*')
        .eq('id', editLineId)
        .single();

      if (lineError) throw lineError;

      setLineData({
        name: existingLineData.line_name,
        min_speed: existingLineData.min_speed || 0,
        max_speed: existingLineData.max_speed || 0,
        line_description: existingLineData.line_description || "",
        product_description: existingLineData.product_description || "",
      });

      // Load positions with titles
      const { data: positionsData, error: positionsError } = await supabase
        .from('positions')
        .select('*, position_titles(id, title)')
        .eq('line_id', editLineId)
        .order('position_x', { ascending: true });

      if (positionsError) throw positionsError;

      // Load equipment, cameras, and IoT devices for each position
      const loadedPositions = await Promise.all(
        (positionsData || []).map(async (pos) => {
          const { data: equipmentData, error: equipmentError } = await supabase
            .from('equipment')
            .select('*, cameras(*), iot_devices(*)')
            .eq('position_id', pos.id);

          if (equipmentError) throw equipmentError;

          return {
            id: pos.id,
            name: pos.name,
            position_x: pos.position_x,
            position_y: pos.position_y,
            titles: (pos.position_titles || []).map((pt: any) => ({
              id: pt.id,
              title: pt.title as "RLE" | "OP"
            })),
            equipment: (equipmentData || []).map((eq) => ({
              id: eq.id,
              name: eq.name,
              equipment_type: eq.equipment_type || "",
              cameras: (eq.cameras || []).map((cam: any) => ({
                id: cam.id,
                name: cam.mac_address,
                camera_type: cam.camera_type,
                lens_type: cam.lens_type,
                light_required: cam.light_required || false,
                light_id: cam.light_id || undefined,
              })),
              iot_devices: (eq.iot_devices || []).map((iot: any) => ({
                id: iot.id,
                name: iot.name,
                hardware_master_id: iot.hardware_master_id,
                receiver_master_id: undefined,
              })),
            })),
          };
        })
      );

      setPositions(loadedPositions);
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

      let lineId = editLineId;

      if (editLineId) {
        // Update existing solutions line
        const { error: lineError } = await supabase
          .from('solutions_lines')
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

        // Delete existing positions and equipment for update
        await supabase.from('positions').delete().eq('line_id', editLineId);
      } else {
        // Create new solutions line
        const { data: newLine, error: lineError } = await supabase
          .from("solutions_lines")
          .insert({
            solutions_project_id: solutionsProjectId,
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
        lineId = newLine.id;
      }

      console.log('Saving solutions line with positions:', positions.length);
      console.log('Equipment in positions:', positions.map(p => ({ 
        name: p.name, 
        equipment: p.equipment.map(e => ({ 
          name: e.name, 
          cameras: e.cameras.length, 
          iot: e.iot_devices.length 
        }))
      })));
      
      // Save process flow (positions, titles, equipment, cameras, IoT devices)
      for (const position of positions) {
        const { data: positionData, error: positionError } = await supabase
          .from('positions')
          .insert({
            line_id: lineId,
            name: position.name,
            position_x: position.position_x,
            position_y: position.position_y,
          })
          .select()
          .single();

        if (positionError) throw positionError;

        // Insert position titles
        for (const title of position.titles) {
          const { error: ptError } = await supabase.from('position_titles').insert({
            position_id: positionData.id,
            title: title.title,
          });
          if (ptError) throw ptError;
        }

        // Insert equipment for this position
        for (const eq of position.equipment) {
          const { data: equipmentData, error: equipmentError } = await supabase
            .from('equipment')
            .insert({
              solutions_line_id: lineId,
              position_id: positionData.id,
              name: eq.name,
              equipment_type: eq.equipment_type || null,
              position_x: 0,
              position_y: 0,
            })
            .select()
            .single();

          if (equipmentError) throw equipmentError;

          // Insert cameras
          for (const camera of eq.cameras) {
            const { error: camError } = await supabase.from('cameras').insert({
              equipment_id: equipmentData.id,
              mac_address: `CAM-${Math.random().toString(36).substring(7)}`,
              camera_type: camera.camera_type || 'Generic',
              lens_type: camera.lens_type || 'Standard',
              light_required: camera.light_required || false,
              light_id: camera.light_id || null,
            });
            if (camError) throw camError;
          }

          // Insert IoT devices
          for (const iot of eq.iot_devices) {
            const { error: iotError } = await supabase.from('iot_devices').insert({
              equipment_id: equipmentData.id,
              name: iot.name,
              mac_address: `IOT-${Math.random().toString(36).substring(7)}`,
              hardware_master_id: iot.hardware_master_id,
              receiver_mac_address: `REC-${Math.random().toString(36).substring(7)}`,
            });
            if (iotError) throw iotError;
          }
        }
      }

      toast({
        title: "Success",
        description: editLineId ? "Solutions line updated successfully" : "Solutions line created successfully with full configuration.",
      });

      onComplete();
      onOpenChange(false);
      
      // Reset state
      setCurrentStep(1);
      setLineData({ name: "", min_speed: 0, max_speed: 0, line_description: "", product_description: "" });
      setPositions([]);

    } catch (error) {
      console.error("Error creating solutions line:", error);
      toast({
        title: "Error",
        description: "Failed to create solutions line. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{editLineId ? "Edit Solutions Line" : "Create New Solutions Line"}</DialogTitle>
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
          {currentStep === 4 && <DeviceAssignment positions={positions} setPositions={setPositions} solutionsProjectId={solutionsProjectId} />}
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