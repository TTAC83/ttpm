import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import type { PlcOutput } from "@/schemas/cameraSchema";

interface PlcTabProps {
  data: PlcOutput[];
  onChange: (outputs: PlcOutput[]) => void;
}

export const PlcTab: React.FC<PlcTabProps> = ({ data, onChange }) => {
  const addOutput = () => {
    const newOutput: PlcOutput = {
      output_number: data.length + 1,
      type: "",
      custom_name: "",
      notes: "",
    };
    onChange([...data, newOutput]);
  };

  const updateOutput = (index: number, updates: Partial<PlcOutput>) => {
    const updated = [...data];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeOutput = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">PLC Relay Outputs</h3>
        <Button onClick={addOutput} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Output
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No PLC outputs configured</p>
      ) : (
        <div className="space-y-4">
          {data.map((output, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="grid grid-cols-2 gap-4 flex-1">
                  <div>
                    <Label>Output Number</Label>
                    <Input
                      type="number"
                      min={1}
                      max={16}
                      value={output.output_number}
                      onChange={(e) => updateOutput(index, { output_number: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Input
                      value={output.type || ""}
                      onChange={(e) => updateOutput(index, { type: e.target.value })}
                      placeholder="e.g., Reject, Pass"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Custom Name</Label>
                    <Input
                      value={output.custom_name || ""}
                      onChange={(e) => updateOutput(index, { custom_name: e.target.value })}
                      placeholder="Output name"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Notes</Label>
                    <Textarea
                      value={output.notes || ""}
                      onChange={(e) => updateOutput(index, { notes: e.target.value })}
                      placeholder="Additional notes"
                      rows={2}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeOutput(index)}
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
