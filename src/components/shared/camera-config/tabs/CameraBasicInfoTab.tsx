import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TabsContent } from "@/components/ui/tabs";
import { CameraFormData, MasterData } from "../types";

interface CameraBasicInfoTabProps {
  formData: CameraFormData;
  masterData: MasterData;
  updateField: (field: keyof CameraFormData, value: any) => void;
}

export function CameraBasicInfoTab({ formData, masterData, updateField }: CameraBasicInfoTabProps) {
  return (
    <TabsContent value="basic" className="space-y-4 mt-0">
      <div>
        <Label htmlFor="camera-name">Camera Name *</Label>
        <Input
          id="camera-name"
          value={formData.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Enter camera name"
        />
      </div>
      <div>
        <Label htmlFor="camera-model">Camera Model *</Label>
        <Select
          value={formData.camera_master_id}
          onValueChange={(value) => updateField("camera_master_id", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose camera model" />
          </SelectTrigger>
          <SelectContent>
            {masterData.cameras.map((camera) => (
              <SelectItem key={camera.id} value={camera.id}>
                {camera.manufacturer} - {camera.model_number}
                {camera.camera_type && ` (${camera.camera_type})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="lens-model">Lens Model</Label>
        <Select
          value={formData.lens_master_id}
          onValueChange={(value) => updateField("lens_master_id", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose lens model (optional)" />
          </SelectTrigger>
          <SelectContent>
            {masterData.lenses.map((lens) => (
              <SelectItem key={lens.id} value={lens.id}>
                {lens.manufacturer} - {lens.model_number}
                {lens.focal_length && ` (${lens.focal_length})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </TabsContent>
  );
}
