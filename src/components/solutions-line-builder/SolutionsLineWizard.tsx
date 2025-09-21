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
    mac_address: string;
  }>;
  iot_devices: Array<{
    id: string;
    name: string;
    mac_address: string;
    receiver_mac_address: string;
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
      const { data: lineData, error: lineError } = await supabase
        .from('solutions_lines')
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
      });

      // For solutions lines, we don't have positions/equipment in the database yet
      // This is just the basic line info
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
          })
          .eq('id', editLineId);

        if (lineError) throw lineError;
      } else {
        // Create new solutions line
        const { error: lineError } = await supabase
          .from("solutions_lines")
          .insert({
            solutions_project_id: solutionsProjectId,
            line_name: lineData.name,
            min_speed: lineData.min_speed,
            max_speed: lineData.max_speed,
            camera_count: totalCameras,
            iot_device_count: totalIotDevices,
          });

        if (lineError) throw lineError;
      }

      toast({
        title: "Success",
        description: editLineId ? "Solutions line updated successfully" : "Solutions line created successfully with equipment configuration.",
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