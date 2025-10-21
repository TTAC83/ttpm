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
          type="number"
          value={formData.horizontal_fov}
          onChange={(e) => updateField("horizontal_fov", e.target.value)}
          placeholder="Enter FOV in mm"
        />
      </div>
      <div>
        <Label htmlFor="working-distance">Working Distance (mm)</Label>
        <Input
          id="working-distance"
          type="number"
          value={formData.working_distance}
          onChange={(e) => updateField("working_distance", e.target.value)}
          placeholder="Enter distance in mm"
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
