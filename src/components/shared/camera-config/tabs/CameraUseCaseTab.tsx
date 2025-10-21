import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { TabsContent } from "@/components/ui/tabs";
import { CameraFormData, MasterData } from "../types";

interface CameraUseCaseTabProps {
  formData: CameraFormData;
  masterData: MasterData;
  updateField: (field: keyof CameraFormData, value: any) => void;
  toggleUseCase: (useCaseId: string) => void;
}

export function CameraUseCaseTab({ formData, masterData, updateField, toggleUseCase }: CameraUseCaseTabProps) {
  return (
    <TabsContent value="usecase" className="space-y-4 mt-0">
      <div>
        <Label className="text-base mb-3 block">Select Vision Use Cases</Label>
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {masterData.visionUseCases.map((useCase) => (
            <div key={useCase.id} className="flex items-start space-x-2">
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
                  {useCase.category && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({useCase.category})
                    </span>
                  )}
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
    </TabsContent>
  );
}
