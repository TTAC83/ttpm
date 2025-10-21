import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  return (
    <TabsContent value="hmi" className="space-y-4 mt-0">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="hmi-required"
          checked={formData.hmi_required}
          onCheckedChange={(checked) => {
            updateField("hmi_required", !!checked);
            if (!checked) {
              updateField("hmi_master_id", "");
            }
          }}
        />
        <Label htmlFor="hmi-required">HMI Required</Label>
      </div>

      {formData.hmi_required ? (
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
      ) : (
        <p className="text-sm text-muted-foreground">
          Check "HMI Required" to configure HMI for this camera.
        </p>
      )}
    </TabsContent>
  );
}
