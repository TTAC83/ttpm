import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { CameraView } from "@/schemas/cameraSchema";

interface ViewsTabProps {
  data: CameraView[];
  onChange: (views: CameraView[]) => void;
}

export const ViewsTab: React.FC<ViewsTabProps> = ({ data, onChange }) => {
  const addView = () => {
    const newView: CameraView = {
      product_flow: "",
      description: "",
    };
    onChange([...data, newView]);
  };

  const updateView = (index: number, updates: Partial<CameraView>) => {
    const updated = [...data];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeView = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Camera Views</h3>
        <Button onClick={addView} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add View
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No camera views configured</p>
      ) : (
        <div className="space-y-4">
          {data.map((view, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Product Flow</Label>
                    <Input
                      value={view.product_flow || ""}
                      onChange={(e) => updateView(index, { product_flow: e.target.value })}
                      placeholder="e.g., Left to Right, Top to Bottom"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={view.description || ""}
                      onChange={(e) => updateView(index, { description: e.target.value })}
                      placeholder="Describe the camera view"
                      rows={3}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeView(index)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
