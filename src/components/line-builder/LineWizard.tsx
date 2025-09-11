import React, { useState } from "react";
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

interface Equipment {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  equipment_type?: string;
  titles: Array<{ id: string; title: "RLE" | "OP" }>;
  cameras: Array<{
    id: string;
    camera_type: string;
    lens_type: string;
    mac_address: string;
  }>;
  iot_devices: Array<{
    id: string;
    mac_address: string;
    receiver_mac_address: string;
  }>;
}

interface LineWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onComplete: () => void;
}

export const LineWizard: React.FC<LineWizardProps> = ({
  open,
  onOpenChange,
  projectId,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [lineData, setLineData] = useState({
    name: "",
    min_speed: 0,
    max_speed: 0,
  });
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const { toast } = useToast();

  const steps = [
    { id: 1, title: "Basic Info", component: LineBasicInfo },
    { id: 2, title: "Process Flow", component: ProcessFlowBuilder },
    { id: 3, title: "Equipment Titles", component: EquipmentTitles },
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
      // Create the line
      const { data: lineResult, error: lineError } = await supabase
        .from("lines")
        .insert({
          project_id: projectId,
          line_name: lineData.name,
          min_speed: lineData.min_speed,
          max_speed: lineData.max_speed,
          camera_count: equipment.reduce((acc, eq) => acc + eq.cameras.length, 0),
          iot_device_count: equipment.reduce((acc, eq) => acc + eq.iot_devices.length, 0),
        })
        .select()
        .single();

      if (lineError) throw lineError;

      const lineId = lineResult.id;

      // Create equipment
      for (const eq of equipment) {
        const { data: equipmentResult, error: equipmentError } = await supabase
          .from("equipment")
          .insert({
            line_id: lineId,
            name: eq.name,
            position_x: eq.position_x,
            position_y: eq.position_y,
            equipment_type: eq.equipment_type,
          })
          .select()
          .single();

        if (equipmentError) throw equipmentError;

        const equipmentId = equipmentResult.id;

        // Create titles
        if (eq.titles.length > 0) {
          const titlesData = eq.titles.map((title) => ({
            equipment_id: equipmentId,
            title: title.title,
          }));
          
          const { error: titlesError } = await supabase
            .from("equipment_titles")
            .insert(titlesData);

          if (titlesError) throw titlesError;
        }

        // Create cameras
        if (eq.cameras.length > 0) {
          const camerasData = eq.cameras.map((camera) => ({
            equipment_id: equipmentId,
            camera_type: camera.camera_type,
            lens_type: camera.lens_type,
            mac_address: camera.mac_address,
          }));

          const { error: camerasError } = await supabase
            .from("cameras")
            .insert(camerasData);

          if (camerasError) throw camerasError;
        }

        // Create IoT devices
        if (eq.iot_devices.length > 0) {
          const iotData = eq.iot_devices.map((device) => ({
            equipment_id: equipmentId,
            mac_address: device.mac_address,
            receiver_mac_address: device.receiver_mac_address,
          }));

          const { error: iotError } = await supabase
            .from("iot_devices")
            .insert(iotData);

          if (iotError) throw iotError;
        }
      }

      toast({
        title: "Success",
        description: "Line created successfully with all equipment and devices.",
      });

      onComplete();
      onOpenChange(false);
      
      // Reset state
      setCurrentStep(1);
      setLineData({ name: "", min_speed: 0, max_speed: 0 });
      setEquipment([]);

    } catch (error) {
      console.error("Error creating line:", error);
      toast({
        title: "Error",
        description: "Failed to create line. Please try again.",
        variant: "destructive",
      });
    }
  };

  const CurrentStepComponent = steps[currentStep - 1].component;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Production Line</DialogTitle>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep} of {steps.length}: {steps[currentStep - 1].title}</span>
              <span>{Math.round(progress)}% complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <CurrentStepComponent
            lineData={lineData}
            setLineData={setLineData}
            equipment={equipment}
            setEquipment={setEquipment}
          />
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