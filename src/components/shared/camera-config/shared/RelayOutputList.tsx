import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface RelayOutput {
  id: string;
  output_number: number;
  type: string;
  custom_name: string;
  notes: string;
}

interface RelayOutputListProps {
  outputs: RelayOutput[];
  onAdd: () => void;
  onUpdate: (id: string, field: string, value: string | number) => void;
  onDelete: (id: string) => void;
}

export function RelayOutputList({ outputs, onAdd, onUpdate, onDelete }: RelayOutputListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base">Relay Outputs</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" />
          Add Output
        </Button>
      </div>

      {outputs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No relay outputs added</p>
      ) : (
        <div className="space-y-3 max-h-[300px] overflow-y-auto">
          {outputs.map((output) => (
            <Card key={output.id} className="p-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">Output {output.output_number}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(output.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div>
                  <Label htmlFor={`output-type-${output.id}`}>Type *</Label>
                  <Select
                    value={output.type}
                    onValueChange={(value) => onUpdate(output.id, "type", value)}
                  >
                    <SelectTrigger id={`output-type-${output.id}`}>
                      <SelectValue placeholder="Select output type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sounder/Beacon">Sounder/Beacon</SelectItem>
                      <SelectItem value="Belt Stop">Belt Stop</SelectItem>
                      <SelectItem value="Reject System">Reject System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`output-name-${output.id}`}>Custom Name (Optional)</Label>
                  <Input
                    id={`output-name-${output.id}`}
                    value={output.custom_name}
                    onChange={(e) => onUpdate(output.id, "custom_name", e.target.value)}
                    placeholder="Enter custom name"
                  />
                </div>

                <div>
                  <Label htmlFor={`output-notes-${output.id}`}>Notes (Optional)</Label>
                  <Textarea
                    id={`output-notes-${output.id}`}
                    value={output.notes}
                    onChange={(e) => onUpdate(output.id, "notes", e.target.value)}
                    placeholder="Enter any notes"
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
