import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const radioValue = formData.light_required === null ? "" : formData.light_required ? "yes" : "no";

  return (
    <TabsContent value="lighting" className="space-y-4 mt-0">
      <div>
        <Label className="text-sm font-medium">Is lighting required?</Label>
        <RadioGroup
          value={radioValue}
          onValueChange={(val) => {
            const isRequired = val === "yes";
            updateField("light_required", isRequired);
            if (!isRequired) {
              updateField("light_id", "");
              updateField("light_notes", "");
            }
          }}
          className="flex gap-4 mt-2"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="yes" id="light-yes" />
            <Label htmlFor="light-yes">Yes</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="no" id="light-no" />
            <Label htmlFor="light-no">No</Label>
          </div>
        </RadioGroup>
        {formData.light_required !== null && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs mt-1"
            onClick={() => {
              updateField("light_required", null);
              updateField("light_id", "");
              updateField("light_notes", "");
            }}
          >
            Clear selection
          </Button>
        )}
      </div>

      {formData.light_required === null && (
        <p className="text-sm text-destructive">
          Please confirm whether lighting is required for this camera.
        </p>
      )}

      {formData.light_required === true && (
        <>
          <div>
            <Label htmlFor="light-select">Select Light Model (Optional)</Label>
            <Select
              value={formData.light_id}
              onValueChange={(value) => updateField("light_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose light model (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non-standard">Non-Standard</SelectItem>
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
            <Label htmlFor="light-notes">Lighting Notes</Label>
            <Textarea
              id="light-notes"
              value={formData.light_notes}
              onChange={(e) => updateField("light_notes", e.target.value)}
              placeholder="Enter lighting requirements, specifications, or notes"
              rows={3}
            />
          </div>
        </>
      )}

      {formData.light_required === false && (
        <p className="text-sm text-muted-foreground">
          No lighting required for this camera.
        </p>
      )}
    </TabsContent>
  );
}
