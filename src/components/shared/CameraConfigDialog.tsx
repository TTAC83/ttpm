import React, { useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lightbulb, Cpu, Monitor } from "lucide-react";
import { useCameraForm } from "./camera-config/useCameraForm";
import { CameraBasicInfoTab } from "./camera-config/tabs/CameraBasicInfoTab";
import { CameraMeasurementsTab } from "./camera-config/tabs/CameraMeasurementsTab";
import { CameraUseCaseTab } from "./camera-config/tabs/CameraUseCaseTab";
import { CameraViewTab } from "./camera-config/tabs/CameraViewTab";
import { CameraLightingTab } from "./camera-config/tabs/CameraLightingTab";
import { CameraPlcTab } from "./camera-config/tabs/CameraPlcTab";
import { CameraHmiTab } from "./camera-config/tabs/CameraHmiTab";
import { CameraFormData, MasterData } from "./camera-config/types";
import { useToast } from "@/hooks/use-toast";

interface CameraConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  cameraData?: CameraFormData;
  masterData: MasterData;
  onSave: (formData: CameraFormData) => void;
}

export const CameraConfigDialog: React.FC<CameraConfigDialogProps> = ({
  open,
  onOpenChange,
  mode,
  cameraData,
  masterData,
  onSave,
}) => {
  const { toast } = useToast();
  const {
    formData,
    updateField,
    addAttribute,
    updateAttribute,
    deleteAttribute,
    toggleUseCase,
    addRelayOutput,
    updateRelayOutput,
    deleteRelayOutput,
    resetForm,
  } = useCameraForm();

  useEffect(() => {
    if (open) {
      resetForm(cameraData);
    }
  }, [open, cameraData, resetForm]);

  const handleSave = () => {
    if (!formData.name || !formData.camera_type) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit" : "Add"} Camera
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full flex-1 overflow-hidden flex flex-col">
          <TabsList className="inline-flex w-full overflow-x-auto">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="usecase">Use Case</TabsTrigger>
            <TabsTrigger value="cameraview">Camera View</TabsTrigger>
            <TabsTrigger value="lighting">
              <Lightbulb className="h-4 w-4 mr-1" />
              Lighting
            </TabsTrigger>
            <TabsTrigger value="plc">
              <Cpu className="h-4 w-4 mr-1" />
              PLC
            </TabsTrigger>
            <TabsTrigger value="hmi">
              <Monitor className="h-4 w-4 mr-1" />
              HMI
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <CameraBasicInfoTab formData={formData} masterData={masterData} updateField={updateField} />
            <CameraMeasurementsTab formData={formData} updateField={updateField} />
            <CameraUseCaseTab 
              formData={formData} 
              masterData={masterData} 
              updateField={updateField}
              toggleUseCase={toggleUseCase}
              addAttribute={addAttribute}
              updateAttribute={updateAttribute}
              deleteAttribute={deleteAttribute}
            />
            <CameraViewTab
              formData={formData}
              updateField={updateField}
            />
            <CameraLightingTab formData={formData} masterData={masterData} updateField={updateField} />
            <CameraPlcTab
              formData={formData}
              masterData={masterData}
              updateField={updateField}
              addRelayOutput={addRelayOutput}
              updateRelayOutput={updateRelayOutput}
              deleteRelayOutput={deleteRelayOutput}
            />
            <CameraHmiTab formData={formData} masterData={masterData} updateField={updateField} />
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button onClick={handleSave} className="w-full">
            Save Camera Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
