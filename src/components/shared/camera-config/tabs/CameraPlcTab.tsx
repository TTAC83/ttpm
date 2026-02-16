import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { RelayOutputList } from "../shared/RelayOutputList";
import { CameraFormData, MasterData } from "../types";
// IMPORTANT: PLCs come from hardware_master via hardwareCatalog service, not from plc_master table

interface CameraPlcTabProps {
  formData: CameraFormData;
  masterData: MasterData;
  updateField: (field: keyof CameraFormData, value: any) => void;
  addRelayOutput: () => void;
  updateRelayOutput: (id: string, field: string, value: string | number) => void;
  deleteRelayOutput: (id: string) => void;
}

export function CameraPlcTab({ 
  formData, 
  masterData, 
  updateField, 
  addRelayOutput,
  updateRelayOutput,
  deleteRelayOutput
}: CameraPlcTabProps) {
  const radioValue = formData.plc_attached === null ? "" : formData.plc_attached ? "yes" : "no";

  return (
    <TabsContent value="plc" className="space-y-4 mt-0">
      <div>
        <Label className="text-sm font-medium">Is a PLC required?</Label>
        <RadioGroup
          value={radioValue}
          onValueChange={(val) => {
            const isRequired = val === "yes";
            updateField("plc_attached", isRequired);
            if (!isRequired) {
              updateField("plc_master_id", "");
              updateField("relay_outputs", []);
            }
          }}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="plc-yes" />
            <Label htmlFor="plc-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="plc-no" />
            <Label htmlFor="plc-no">No</Label>
          </div>
        </RadioGroup>
        {formData.plc_attached !== null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs mt-1"
            onClick={() => {
              updateField("plc_attached", null);
              updateField("plc_master_id", "");
              updateField("relay_outputs", []);
            }}
          >
            Clear selection
          </Button>
        )}
      </div>

      {formData.plc_attached === null && (
        <p className="text-sm text-destructive">
          Please confirm whether a PLC is required for this camera.
        </p>
      )}

      {formData.plc_attached === true && (
        <>
          <div>
            <Label htmlFor="plc-select">Select PLC Model</Label>
            <Select
              value={formData.plc_master_id}
              onValueChange={(value) => updateField("plc_master_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose PLC model" />
              </SelectTrigger>
              <SelectContent>
                {masterData.plcs.map((plc) => (
                  <SelectItem key={plc.id} value={plc.id}>
                    {plc.manufacturer} - {plc.model_number}
                    {plc.plc_type && ` (${plc.plc_type})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 border-t">
            <RelayOutputList
              outputs={formData.relay_outputs}
              onAdd={addRelayOutput}
              onUpdate={updateRelayOutput}
              onDelete={deleteRelayOutput}
            />
          </div>
        </>
      )}

      {formData.plc_attached === false && (
        <p className="text-sm text-muted-foreground">
          No PLC required for this camera.
        </p>
      )}
    </TabsContent>
  );
}
