import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { LineBasicInfo } from "./steps/LineBasicInfo";
import { ProcessFlowBuilder } from "./steps/ProcessFlowBuilder";
import { EquipmentTitles } from "./steps/EquipmentTitles";
import { DeviceAssignment } from "./steps/DeviceAssignment";
import { useLineWizard } from "./hooks/useLineWizard";
import { lineWizardConfig } from "./config/wizardConfig";

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
  const {
    currentStep,
    lineData,
    setLineData,
    positions,
    setPositions,
    handleComplete,
    handleNext,
    handlePrevious,
    isLoading,
  } = useLineWizard(lineWizardConfig, projectId, editLineId, open);

  const steps = [
    { id: 1, title: "Basic Info", component: LineBasicInfo },
    { id: 2, title: "Process Flow", component: ProcessFlowBuilder },
    { id: 3, title: "Position Titles", component: EquipmentTitles },
    { id: 4, title: "Devices", component: DeviceAssignment },
  ];

  const progress = (currentStep / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep - 1].component;

  const onCompleteWizard = async () => {
    const success = await handleComplete();
    if (success) {
      onComplete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editLineId ? "Edit Production Line" : "Create Production Line"}
          </DialogTitle>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{steps[currentStep - 1].title}</span>
              <span className="text-muted-foreground">Step {currentStep} of {steps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 relative">
          {isLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading line data...</p>
            </div>
          ) : (
            <CurrentStepComponent
              lineData={lineData}
              setLineData={setLineData}
              positions={positions}
              setPositions={setPositions}
            />
          )}
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={currentStep === steps.length ? onCompleteWizard : handleNext}
            disabled={isLoading}
          >
            {currentStep === steps.length ? "Complete Setup" : "Next"}
            {currentStep < steps.length && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
