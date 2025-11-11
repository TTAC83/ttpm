import React from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { AttributeList } from "../shared/AttributeList";
import { CameraFormData, MasterData } from "../types";

interface CameraUseCaseTabProps {
  formData: CameraFormData;
  masterData: MasterData;
  updateField: (field: keyof CameraFormData, value: any) => void;
  toggleUseCase: (useCaseId: string) => void;
  addAttribute: () => void;
  updateAttribute: (id: string, field: "title" | "description", value: string) => void;
  deleteAttribute: (id: string) => void;
}

export function CameraUseCaseTab({ 
  formData, 
  masterData, 
  updateField, 
  toggleUseCase,
  addAttribute,
  updateAttribute,
  deleteAttribute
}: CameraUseCaseTabProps) {
  // Filter out any invalid use case IDs that might be in formData
  const validUseCaseIds = formData.use_case_ids.filter(id => 
    masterData.visionUseCases.some(uc => uc.id === id)
  );

  // Update if we filtered out any invalid IDs
  React.useEffect(() => {
    if (validUseCaseIds.length !== formData.use_case_ids.length) {
      updateField('use_case_ids', validUseCaseIds);
    }
  }, [formData.use_case_ids, validUseCaseIds, updateField]);

  // Group use cases by category
  const groupedUseCases = masterData.visionUseCases.reduce((acc, useCase) => {
    const category = useCase.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(useCase);
    return acc;
  }, {} as Record<string, typeof masterData.visionUseCases>);

  return (
    <TabsContent value="usecase" className="space-y-4 mt-0">
      <div>
        <Label className="text-base mb-3 block">Select Vision Use Cases</Label>
        <div className="space-y-4 max-h-[300px] overflow-y-auto">
          {Object.entries(groupedUseCases).map(([category, useCases]) => (
            <div key={category} className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">{category}</h3>
              {useCases.map((useCase) => (
                <div key={useCase.id} className="flex items-start space-x-2 ml-2">
                  <Checkbox
                    id={`usecase-${useCase.id}`}
                    checked={formData.use_case_ids.includes(useCase.id)}
                    onCheckedChange={() => toggleUseCase(useCase.id)}
                  />
                  <div className="flex-1">
                    <Label 
                      htmlFor={`usecase-${useCase.id}`}
                      className="font-medium cursor-pointer"
                    >
                      {useCase.name}
                    </Label>
                    {useCase.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {useCase.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div>
        <Label htmlFor="use-case-description">Additional Description (Optional)</Label>
        <Textarea
          id="use-case-description"
          value={formData.use_case_description}
          onChange={(e) => updateField("use_case_description", e.target.value)}
          placeholder="Add any specific details about the use cases"
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
