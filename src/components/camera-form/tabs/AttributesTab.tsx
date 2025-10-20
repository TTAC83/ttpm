import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import type { CameraAttribute } from "@/schemas/cameraSchema";

interface AttributesTabProps {
  data: CameraAttribute[];
  onChange: (attributes: CameraAttribute[]) => void;
}

export const AttributesTab: React.FC<AttributesTabProps> = ({ data, onChange }) => {
  const addAttribute = () => {
    const newAttr: CameraAttribute = {
      title: "",
      description: "",
      order_index: data.length,
    };
    onChange([...data, newAttr]);
  };

  const updateAttribute = (index: number, updates: Partial<CameraAttribute>) => {
    const updated = [...data];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeAttribute = (index: number) => {
    const updated = data.filter((_, i) => i !== index);
    // Reindex
    updated.forEach((attr, i) => attr.order_index = i);
    onChange(updated);
  };

  const moveAttribute = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;

    const updated = [...data];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((attr, i) => attr.order_index = i);
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Camera Attributes</h3>
        <Button onClick={addAttribute} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Attribute
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attributes configured</p>
      ) : (
        <div className="space-y-4">
          {data.map((attr, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Title *</Label>
                    <Input
                      value={attr.title}
                      onChange={(e) => updateAttribute(index, { title: e.target.value })}
                      placeholder="Attribute title"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={attr.description || ""}
                      onChange={(e) => updateAttribute(index, { description: e.target.value })}
                      placeholder="Attribute description"
                      rows={2}
                    />
                  </div>
                </div>
                <div className="ml-2 flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveAttribute(index, "up")}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => moveAttribute(index, "down")}
                    disabled={index === data.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAttribute(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
