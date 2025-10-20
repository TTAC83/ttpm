import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useCameraForm } from "@/hooks/useCameraForm";
import { BasicsTab } from "./tabs/BasicsTab";
import { PlcTab } from "./tabs/PlcTab";
import { MeasurementsTab } from "./tabs/MeasurementsTab";
import { AttributesTab } from "./tabs/AttributesTab";
import { UseCasesTab } from "./tabs/UseCasesTab";
import { ViewsTab } from "./tabs/ViewsTab";

interface CameraFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cameraId?: string;
  equipmentId?: string;
  onSave?: () => void;
}

export const CameraFormDialog: React.FC<CameraFormDialogProps> = ({
  open,
  onOpenChange,
  cameraId,
  equipmentId,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState("basics");
  const {
    formData,
    isLoading,
    isSaving,
    updateCamera,
    updateMeasurements,
    updatePlcOutputs,
    updateAttributes,
    updateUseCases,
    updateViews,
    saveCamera,
  } = useCameraForm(cameraId, equipmentId);

  const handleSave = async () => {
    const success = await saveCamera();
    if (success) {
      onSave?.();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {cameraId ? "Edit Camera" : "Add Camera"}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-6 w-full">
              <TabsTrigger value="basics">Basics</TabsTrigger>
              <TabsTrigger value="plc">PLC</TabsTrigger>
              <TabsTrigger value="measurements">Measurements</TabsTrigger>
              <TabsTrigger value="attributes">Attributes</TabsTrigger>
              <TabsTrigger value="usecases">Use Cases</TabsTrigger>
              <TabsTrigger value="views">Views</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-auto mt-4">
              <TabsContent value="basics" className="mt-0">
                <BasicsTab data={formData.camera} onChange={updateCamera} />
              </TabsContent>

              <TabsContent value="plc" className="mt-0">
                <PlcTab data={formData.plc_outputs} onChange={updatePlcOutputs} />
              </TabsContent>

              <TabsContent value="measurements" className="mt-0">
                <MeasurementsTab data={formData.measurements} onChange={updateMeasurements} />
              </TabsContent>

              <TabsContent value="attributes" className="mt-0">
                <AttributesTab data={formData.attributes} onChange={updateAttributes} />
              </TabsContent>

              <TabsContent value="usecases" className="mt-0">
                <UseCasesTab data={formData.use_cases} onChange={updateUseCases} />
              </TabsContent>

              <TabsContent value="views" className="mt-0">
                <ViewsTab data={formData.views} onChange={updateViews} />
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save All Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
