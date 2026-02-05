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
        <Label htmlFor="camera-ip">Camera IP</Label>
        <Input
          id="camera-ip"
          value={formData.camera_ip}
          onChange={(e) => updateField("camera_ip", e.target.value)}
          placeholder="Enter camera IP address (optional)"
        />
      </div>
      <div>
        <Label htmlFor="camera-model">Camera Model *</Label>
        <Select
          value={formData.camera_type}
          onValueChange={(value) => updateField("camera_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose camera model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="non-standard">Non-Standard</SelectItem>
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
          value={formData.lens_type}
          onValueChange={(value) => updateField("lens_type", value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choose lens model (optional)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="non-standard">Non-Standard</SelectItem>
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
