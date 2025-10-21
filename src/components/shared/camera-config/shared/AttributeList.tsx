import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Attribute {
  id: string;
  title: string;
  description: string;
}

interface AttributeListProps {
  attributes: Attribute[];
  onAdd: () => void;
  onUpdate: (id: string, field: "title" | "description", value: string) => void;
  onDelete: (id: string) => void;
}

export function AttributeList({ attributes, onAdd, onUpdate, onDelete }: AttributeListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Camera Attributes</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" />
          Add Attribute
        </Button>
      </div>

      {attributes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attributes added</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {attributes.map((attr) => (
            <Card key={attr.id} className="p-3">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`attr-title-${attr.id}`}>Title</Label>
                    <Input
                      id={`attr-title-${attr.id}`}
                      value={attr.title}
                      onChange={(e) => onUpdate(attr.id, "title", e.target.value)}
                      placeholder="Attribute title"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(attr.id)}
                    className="mt-6"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <div>
                  <Label htmlFor={`attr-desc-${attr.id}`}>Description</Label>
                  <Textarea
                    id={`attr-desc-${attr.id}`}
                    value={attr.description}
                    onChange={(e) => onUpdate(attr.id, "description", e.target.value)}
                    placeholder="Attribute description"
                    rows={2}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
