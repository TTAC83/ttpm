import React from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CameraFormData } from "../types";

interface CameraPlacementTabProps {
  formData: CameraFormData;
  updateField: (field: keyof CameraFormData, value: any) => void;
}

export const CameraPlacementTab: React.FC<CameraPlacementTabProps> = ({
  formData,
  updateField,
}) => {
  return (
    <TabsContent value="placement" className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Placement Confirmations
        </h3>

        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="placement_camera_can_fit"
              checked={formData.placement_camera_can_fit === true}
              onCheckedChange={(checked) =>
                updateField("placement_camera_can_fit", checked === true ? true : null)
              }
            />
            <Label htmlFor="placement_camera_can_fit" className="text-sm leading-snug cursor-pointer">
              Confirm camera can fit in the proposed location
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="placement_fabrication_confirmed"
              checked={formData.placement_fabrication_confirmed === true}
              onCheckedChange={(checked) =>
                updateField("placement_fabrication_confirmed", checked === true ? true : null)
              }
            />
            <Label htmlFor="placement_fabrication_confirmed" className="text-sm leading-snug cursor-pointer">
              Confirm fabrication / bracketry requirements with customer
            </Label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="placement_fov_suitable"
              checked={formData.placement_fov_suitable === true}
              onCheckedChange={(checked) =>
                updateField("placement_fov_suitable", checked === true ? true : null)
              }
            />
            <Label htmlFor="placement_fov_suitable" className="text-sm leading-snug cursor-pointer">
              Confirm FOV suitable for all artworks / product types
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="placement_position_description">Position Description</Label>
        <Textarea
          id="placement_position_description"
          value={formData.placement_position_description}
          onChange={(e) => updateField("placement_position_description", e.target.value)}
          placeholder="Describe the camera placement position..."
          rows={4}
        />
      </div>
    </TabsContent>
  );
};
