import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { CameraUseCase } from "@/schemas/cameraSchema";

interface UseCasesTabProps {
  data: CameraUseCase[];
  onChange: (useCases: CameraUseCase[]) => void;
}

export const UseCasesTab: React.FC<UseCasesTabProps> = ({ data, onChange }) => {
  const [visionUseCases, setVisionUseCases] = useState<any[]>([]);

  useEffect(() => {
    loadVisionUseCases();
  }, []);

  const loadVisionUseCases = async () => {
    const { data: cases } = await supabase
      .from("vision_use_cases")
      .select("*")
      .order("category", { ascending: true })
      .order("name", { ascending: true });
    
    if (cases) setVisionUseCases(cases);
  };

  const addUseCase = () => {
    const newCase: CameraUseCase = {
      vision_use_case_id: "",
      description: "",
    };
    onChange([...data, newCase]);
  };

  const updateUseCase = (index: number, updates: Partial<CameraUseCase>) => {
    const updated = [...data];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeUseCase = (index: number) => {
    onChange(data.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Vision Use Cases</h3>
        <Button onClick={addUseCase} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Use Case
        </Button>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No use cases configured</p>
      ) : (
        <div className="space-y-4">
          {data.map((useCase, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="flex-1 space-y-3">
                  <div>
                    <Label>Use Case *</Label>
                    <Select
                      value={useCase.vision_use_case_id}
                      onValueChange={(value) => updateUseCase(index, { vision_use_case_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select use case" />
                      </SelectTrigger>
                      <SelectContent>
                        {visionUseCases.map((uc) => (
                          <SelectItem key={uc.id} value={uc.id}>
                            {uc.name} ({uc.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={useCase.description || ""}
                      onChange={(e) => updateUseCase(index, { description: e.target.value })}
                      placeholder="Additional notes about this use case"
                      rows={2}
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeUseCase(index)}
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
