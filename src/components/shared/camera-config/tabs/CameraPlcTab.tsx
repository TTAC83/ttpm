import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { RelayOutputList } from "../shared/RelayOutputList";
import { CameraFormData, MasterData } from "../types";

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
  return (
    <TabsContent value="plc" className="space-y-4 mt-0">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="plc-attached"
          checked={formData.plc_attached}
          onCheckedChange={(checked) => {
            updateField("plc_attached", !!checked);
            if (!checked) {
              updateField("plc_master_id", "");
              updateField("relay_outputs", []);
            }
          }}
        />
        <Label htmlFor="plc-attached">PLC Attached</Label>
      </div>

      {formData.plc_attached ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">
          Check "PLC Attached" to configure PLC and relay outputs for this camera.
        </p>
      )}
    </TabsContent>
  );
}
