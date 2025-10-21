import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { CameraFormData, MasterData } from "../types";

interface CameraLightingTabProps {
  formData: CameraFormData;
  masterData: MasterData;
  updateField: (field: keyof CameraFormData, value: any) => void;
}

export function CameraLightingTab({ formData, masterData, updateField }: CameraLightingTabProps) {
  return (
    <TabsContent value="lighting" className="space-y-4 mt-0">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="light-required"
          checked={formData.light_required}
          onCheckedChange={(checked) => {
            updateField("light_required", !!checked);
            if (!checked) {
              updateField("light_id", "");
            }
          }}
        />
        <Label htmlFor="light-required">Light Required</Label>
      </div>

      {formData.light_required ? (
        <>
          <div>
            <Label htmlFor="light-select">Select Light Model</Label>
            <Select
              value={formData.light_id}
              onValueChange={(value) => updateField("light_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose light model" />
              </SelectTrigger>
              <SelectContent>
                {masterData.lights.map((light) => (
                  <SelectItem key={light.id} value={light.id}>
                    {light.manufacturer} - {light.model_number}
                    {light.description && ` (${light.description})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="light-notes">Notes (Optional)</Label>
            <Textarea
              id="light-notes"
              value={formData.light_notes}
              onChange={(e) => updateField("light_notes", e.target.value)}
              placeholder="Enter any notes about the lighting configuration"
              rows={3}
            />
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Check "Light Required" to configure lighting for this camera.
        </p>
      )}
    </TabsContent>
  );
}
