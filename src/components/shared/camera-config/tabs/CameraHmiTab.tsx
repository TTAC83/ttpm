import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { CameraFormData, MasterData } from "../types";

interface CameraHmiTabProps {
  formData: CameraFormData;
  masterData: MasterData;
  updateField: (field: keyof CameraFormData, value: any) => void;
}

export function CameraHmiTab({ formData, masterData, updateField }: CameraHmiTabProps) {
  const radioValue = formData.hmi_required === null ? "" : formData.hmi_required ? "yes" : "no";

  return (
    <TabsContent value="hmi" className="space-y-4 mt-0">
      <div>
        <Label className="text-sm font-medium">Is an HMI required?</Label>
        <RadioGroup
          value={radioValue}
          onValueChange={(val) => {
            const isRequired = val === "yes";
            updateField("hmi_required", isRequired);
            if (!isRequired) {
              updateField("hmi_master_id", "");
            }
          }}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="hmi-yes" />
            <Label htmlFor="hmi-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="hmi-no" />
            <Label htmlFor="hmi-no">No</Label>
          </div>
        </RadioGroup>
      </div>

      {formData.hmi_required === null && (
        <p className="text-sm text-destructive">
          Please confirm whether an HMI is required for this camera.
        </p>
      )}

      {formData.hmi_required === true && (
        <>
          <div>
            <Label htmlFor="hmi-select">Select HMI Model</Label>
            <Select
              value={formData.hmi_master_id}
              onValueChange={(value) => updateField("hmi_master_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose HMI model" />
              </SelectTrigger>
              <SelectContent>
                {masterData.hmis.map((hmi) => (
                  <SelectItem key={hmi.id} value={hmi.id}>
                    {hmi.sku_no} - {hmi.product_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hmi-notes">Notes (Optional)</Label>
            <Textarea
              id="hmi-notes"
              value={formData.hmi_notes}
              onChange={(e) => updateField("hmi_notes", e.target.value)}
              placeholder="Enter any notes about the HMI configuration"
              rows={3}
            />
          </div>
        </>
      )}

      {formData.hmi_required === false && (
        <p className="text-sm text-muted-foreground">
          No HMI required for this camera.
        </p>
      )}
    </TabsContent>
  );
}
