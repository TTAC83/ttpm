import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LineBasicInfo } from "@/components/line-builder/steps/LineBasicInfo";
import { ProcessFlowBuilder } from "@/components/line-builder/steps/ProcessFlowBuilder";
import { EquipmentTitles } from "@/components/line-builder/steps/EquipmentTitles";
import { DeviceAssignment } from "@/components/line-builder/steps/DeviceAssignment";
import { useLineWizard } from "@/components/line-builder/hooks/useLineWizard";
import { solutionsLineWizardConfig } from "@/components/line-builder/config/wizardConfig";

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
  const [isSaving, setIsSaving] = React.useState(false);
  
  const {
    currentStep,
    lineData,
    setLineData,
    positions,
    setPositions,
    handleComplete,
    handleNext,
    handlePrevious,
  } = useLineWizard(solutionsLineWizardConfig, solutionsProjectId, editLineId, open);

  const steps = [
    { id: 1, title: "Basic Info", component: LineBasicInfo },
    { id: 2, title: "Process Flow", component: ProcessFlowBuilder },
    { id: 3, title: "Position Titles", component: EquipmentTitles },
    { id: 4, title: "Devices", component: DeviceAssignment },
  ];

  const progress = (currentStep / steps.length) * 100;
  const CurrentStepComponent = steps[currentStep - 1].component;

  const onCompleteWizard = async () => {
    if (isSaving) return; // Prevent double submission
    
    setIsSaving(true);
    try {
      const success = await handleComplete();
      if (success) {
        onComplete();
        onOpenChange(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {editLineId ? "Edit Solutions Line" : "Create Solutions Line"}
          </DialogTitle>
          <div className="space-y-2 mt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{steps[currentStep - 1].title}</span>
              <span className="text-muted-foreground">Step {currentStep} of {steps.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <CurrentStepComponent
            lineData={lineData}
            setLineData={setLineData}
            positions={positions}
            setPositions={setPositions}
          />
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            onClick={currentStep === steps.length ? onCompleteWizard : handleNext}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : currentStep === steps.length ? "Complete Setup" : "Next"}
            {currentStep < steps.length && <ChevronRight className="h-4 w-4 ml-2" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
