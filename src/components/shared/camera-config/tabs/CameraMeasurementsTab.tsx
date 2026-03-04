import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TabsContent } from "@/components/ui/tabs";
import { CameraFormData } from "../types";

interface CameraMeasurementsTabProps {
  formData: CameraFormData;
  updateField: (field: keyof CameraFormData, value: any) => void;
}

export function CameraMeasurementsTab({ formData, updateField }: CameraMeasurementsTabProps) {
  return (
    <TabsContent value="measurements" className="space-y-4 mt-0">
      <div>
        <Label htmlFor="horizontal-fov">Horizontal FOV (mm)</Label>
        <Input
          id="horizontal-fov"
          type="text"
          value={formData.horizontal_fov}
          onChange={(e) => {
            const val = e.target.value;
            if (val.toUpperCase() === 'TBC' || val === '' || /^\d*\.?\d*$/.test(val)) {
              updateField("horizontal_fov", val.toUpperCase() === 'TBC' ? 'TBC' : val);
            }
          }}
          placeholder="Enter FOV in mm or TBC"
        />
      </div>
      <div>
        <Label htmlFor="working-distance">Working Distance (mm)</Label>
        <Input
          id="working-distance"
          type="text"
          value={formData.working_distance}
          onChange={(e) => {
            const val = e.target.value;
            if (val.toUpperCase() === 'TBC' || val === '' || /^\d*\.?\d*$/.test(val)) {
              updateField("working_distance", val.toUpperCase() === 'TBC' ? 'TBC' : val);
            }
          }}
          placeholder="Enter distance in mm or TBC"
        />
      </div>
      <div>
        <Label htmlFor="smallest-text">Smallest Text Size (mm)</Label>
        <Input
          id="smallest-text"
          value={formData.smallest_text}
          onChange={(e) => updateField("smallest_text", e.target.value)}
          placeholder="Enter smallest readable text size"
        />
      </div>
    </TabsContent>
  );
}
