import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { AttributeList } from "../shared/AttributeList";
import { CameraFormData } from "../types";

interface CameraViewTabProps {
  formData: CameraFormData;
  updateField: (field: keyof CameraFormData, value: any) => void;
  addAttribute: () => void;
  updateAttribute: (id: string, field: "title" | "description", value: string) => void;
  deleteAttribute: (id: string) => void;
}

export function CameraViewTab({ 
  formData, 
  updateField, 
  addAttribute, 
  updateAttribute, 
  deleteAttribute 
}: CameraViewTabProps) {
  return (
    <TabsContent value="cameraview" className="space-y-4 mt-0">
      <div>
        <Label htmlFor="product-flow">Product Flow Direction</Label>
        <Textarea
          id="product-flow"
          value={formData.product_flow}
          onChange={(e) => updateField("product_flow", e.target.value)}
          placeholder="Describe the direction and flow of products through the camera view"
          rows={2}
        />
      </div>
      <div>
        <Label htmlFor="camera-view-description">Camera View Description</Label>
        <Textarea
          id="camera-view-description"
          value={formData.camera_view_description}
          onChange={(e) => updateField("camera_view_description", e.target.value)}
          placeholder="Describe what the camera sees and captures"
          rows={3}
        />
      </div>
      <AttributeList
        attributes={formData.attributes}
        onAdd={addAttribute}
        onUpdate={updateAttribute}
        onDelete={deleteAttribute}
      />
    </TabsContent>
  );
}
