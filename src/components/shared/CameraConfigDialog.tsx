import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Lightbulb, Cpu, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CameraFormData {
  name: string;
  camera_master_id: string;
  light_required: boolean;
  light_id: string;
  light_notes: string;
  plc_attached: boolean;
  plc_master_id: string;
  relay_outputs: Array<{
    id: string;
    output_number: number;
    type: string;
    custom_name: string;
    notes: string;
  }>;
  hmi_required: boolean;
  hmi_master_id: string;
  hmi_notes: string;
  horizontal_fov: string;
  working_distance: string;
  smallest_text: string;
  use_case_ids: string[];
  use_case_description: string;
  attributes: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  product_flow: string;
  camera_view_description: string;
}

interface MasterData {
  cameras: Array<{ id: string; manufacturer: string; model_number: string; camera_type?: string }>;
  lights: Array<{ id: string; manufacturer: string; model_number: string; description?: string }>;
  plcs: Array<{ id: string; manufacturer: string; model_number: string; plc_type?: string }>;
  hmis: Array<{ id: string; sku_no: string; product_name: string }>;
  visionUseCases: Array<{ id: string; name: string; description?: string; category?: string }>;
}

interface CameraConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  cameraData?: CameraFormData;
  masterData: MasterData;
  onSave: (formData: CameraFormData) => void;
}

const emptyFormData: CameraFormData = {
  name: "",
  camera_master_id: "",
  light_required: false,
  light_id: "",
  light_notes: "",
  plc_attached: false,
  plc_master_id: "",
  relay_outputs: [],
  hmi_required: false,
  hmi_master_id: "",
  hmi_notes: "",
  horizontal_fov: "",
  working_distance: "",
  smallest_text: "",
  use_case_ids: [],
  use_case_description: "",
  attributes: [],
  product_flow: "",
  camera_view_description: "",
};

export const CameraConfigDialog: React.FC<CameraConfigDialogProps> = ({
  open,
  onOpenChange,
  mode,
  cameraData,
  masterData,
  onSave,
}) => {
  const [formData, setFormData] = useState<CameraFormData>(emptyFormData);

  useEffect(() => {
    if (open) {
      setFormData(cameraData || emptyFormData);
    }
  }, [open, cameraData]);

  const handleSave = () => {
    if (!formData.name || !formData.camera_master_id) {
      return;
    }
    onSave(formData);
    onOpenChange(false);
  };

  const addAttribute = () => {
    setFormData({
      ...formData,
      attributes: [
        ...formData.attributes,
        { id: Math.random().toString(36).substring(7), title: "", description: "" },
      ],
    });
  };

  const updateAttribute = (id: string, field: "title" | "description", value: string) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.map((attr) =>
        attr.id === id ? { ...attr, [field]: value } : attr
      ),
    });
  };

  const deleteAttribute = (id: string) => {
    setFormData({
      ...formData,
      attributes: formData.attributes.filter((attr) => attr.id !== id),
    });
  };

  const toggleUseCase = (useCaseId: string) => {
    setFormData({
      ...formData,
      use_case_ids: formData.use_case_ids.includes(useCaseId)
        ? formData.use_case_ids.filter((id) => id !== useCaseId)
        : [...formData.use_case_ids, useCaseId],
    });
  };

  const addRelayOutput = () => {
    setFormData({
      ...formData,
      relay_outputs: [
        ...formData.relay_outputs,
        {
          id: Math.random().toString(36).substring(7),
          output_number: formData.relay_outputs.length + 1,
          type: "",
          custom_name: "",
          notes: "",
        },
      ],
    });
  };

  const updateRelayOutput = (id: string, field: string, value: string | number) => {
    setFormData({
      ...formData,
      relay_outputs: formData.relay_outputs.map((output) =>
        output.id === id ? { ...output, [field]: value } : output
      ),
    });
  };

  const deleteRelayOutput = (id: string) => {
    setFormData({
      ...formData,
      relay_outputs: formData.relay_outputs.filter((output) => output.id !== id),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit" ? "Edit" : "Add"} Camera
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic" className="w-full flex-1 overflow-hidden flex flex-col">
          <TabsList className="inline-flex w-full overflow-x-auto">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
            <TabsTrigger value="usecase">Use Case</TabsTrigger>
            <TabsTrigger value="cameraview">Camera View</TabsTrigger>
            <TabsTrigger value="lighting">
              <Lightbulb className="h-4 w-4 mr-1" />
              Lighting
            </TabsTrigger>
            <TabsTrigger value="plc">
              <Cpu className="h-4 w-4 mr-1" />
              PLC
            </TabsTrigger>
            <TabsTrigger value="hmi">
              <Monitor className="h-4 w-4 mr-1" />
              HMI
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="camera-name">Camera Name *</Label>
                <Input
                  id="camera-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter camera name"
                />
              </div>
              <div>
                <Label htmlFor="camera-model">Camera Model *</Label>
                <Select
                  value={formData.camera_master_id}
                  onValueChange={(value) => setFormData({ ...formData, camera_master_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose camera model" />
                  </SelectTrigger>
                  <SelectContent>
                    {masterData.cameras.map((camera) => (
                      <SelectItem key={camera.id} value={camera.id}>
                        {camera.manufacturer} - {camera.model_number}
                        {camera.camera_type && ` (${camera.camera_type})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            {/* Lighting Tab */}
            <TabsContent value="lighting" className="space-y-4 mt-0">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="light-required"
                  checked={formData.light_required}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      light_required: !!checked,
                      light_id: checked ? formData.light_id : "",
                    })
                  }
                />
                <Label htmlFor="light-required">Light Required</Label>
              </div>

              {formData.light_required && (
                <>
                  <div>
                    <Label htmlFor="light-select">Select Light Model</Label>
                    <Select
                      value={formData.light_id}
                      onValueChange={(value) => setFormData({ ...formData, light_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose light model" />
                      </SelectTrigger>
                      <SelectContent>
                        {masterData.lights.map((light) => (
                          <SelectItem key={light.id} value={light.id}>
                            {light.manufacturer} - {light.model_number}
                            {light.description && ` (${light.description})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="light-notes">Notes (Optional)</Label>
                    <Textarea
                      id="light-notes"
                      value={formData.light_notes}
                      onChange={(e) => setFormData({ ...formData, light_notes: e.target.value })}
                      placeholder="Enter any notes about the lighting configuration"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {!formData.light_required && (
                <p className="text-sm text-muted-foreground">
                  Check "Light Required" to configure lighting for this camera.
                </p>
              )}
            </TabsContent>

            {/* PLC Tab */}
            <TabsContent value="plc" className="space-y-4 mt-0">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="plc-attached"
                  checked={formData.plc_attached}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      plc_attached: !!checked,
                      plc_master_id: checked ? formData.plc_master_id : "",
                      relay_outputs: checked ? formData.relay_outputs : [],
                    })
                  }
                />
                <Label htmlFor="plc-attached">PLC Attached</Label>
              </div>

              {formData.plc_attached ? (
                <>
                  <div>
                    <Label htmlFor="plc-select">Select PLC Model</Label>
                    <Select
                      value={formData.plc_master_id}
                      onValueChange={(value) => setFormData({ ...formData, plc_master_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose PLC model" />
                      </SelectTrigger>
                      <SelectContent>
                        {masterData.plcs.map((plc) => (
                          <SelectItem key={plc.id} value={plc.id}>
                            {plc.manufacturer} - {plc.model_number}
                            {plc.plc_type && ` (${plc.plc_type})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-base">Relay Outputs</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addRelayOutput}>
                        <Plus className="h-3 w-3 mr-1" />
                        Add Output
                      </Button>
                    </div>

                    {formData.relay_outputs.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No relay outputs added</p>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto">
                        {formData.relay_outputs.map((output) => (
                          <Card key={output.id} className="p-3">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-sm">Output {output.output_number}</h4>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteRelayOutput(output.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              <div>
                                <Label htmlFor={`output-type-${output.id}`}>Type *</Label>
                                <Select
                                  value={output.type}
                                  onValueChange={(value) => updateRelayOutput(output.id, "type", value)}
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
                                  onChange={(e) =>
                                    updateRelayOutput(output.id, "custom_name", e.target.value)
                                  }
                                  placeholder="Enter custom name"
                                />
                              </div>

                              <div>
                                <Label htmlFor={`output-notes-${output.id}`}>Notes (Optional)</Label>
                                <Textarea
                                  id={`output-notes-${output.id}`}
                                  value={output.notes}
                                  onChange={(e) => updateRelayOutput(output.id, "notes", e.target.value)}
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
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Check "PLC Attached" to configure PLC and relay outputs for this camera.
                </p>
              )}
            </TabsContent>

            {/* HMI Tab */}
            <TabsContent value="hmi" className="space-y-4 mt-0">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hmi-required"
                  checked={formData.hmi_required}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      hmi_required: !!checked,
                      hmi_master_id: checked ? formData.hmi_master_id : "",
                    })
                  }
                />
                <Label htmlFor="hmi-required">HMI Required</Label>
              </div>

              {formData.hmi_required && (
                <>
                  <div>
                    <Label htmlFor="hmi-select">Select HMI Model</Label>
                    <Select
                      value={formData.hmi_master_id}
                      onValueChange={(value) => setFormData({ ...formData, hmi_master_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose HMI model" />
                      </SelectTrigger>
                      <SelectContent>
                        {masterData.hmis.map((hmi) => (
                          <SelectItem key={hmi.id} value={hmi.id}>
                            {hmi.sku_no} - {hmi.product_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="hmi-notes">Notes (Optional)</Label>
                    <Textarea
                      id="hmi-notes"
                      value={formData.hmi_notes}
                      onChange={(e) => setFormData({ ...formData, hmi_notes: e.target.value })}
                      placeholder="Enter any notes about the HMI configuration"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {!formData.hmi_required && (
                <p className="text-sm text-muted-foreground">
                  Check "HMI Required" to configure HMI for this camera.
                </p>
              )}
            </TabsContent>

            {/* Measurements Tab */}
            <TabsContent value="measurements" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="horizontal-fov">Horizontal Field of View</Label>
                <Input
                  id="horizontal-fov"
                  value={formData.horizontal_fov}
                  onChange={(e) => setFormData({ ...formData, horizontal_fov: e.target.value })}
                  placeholder="e.g., 45°"
                />
              </div>
              <div>
                <Label htmlFor="working-distance">Working Distance</Label>
                <Input
                  id="working-distance"
                  value={formData.working_distance}
                  onChange={(e) => setFormData({ ...formData, working_distance: e.target.value })}
                  placeholder="e.g., 300mm"
                />
              </div>
              <div>
                <Label htmlFor="smallest-text">Smallest Text</Label>
                <Input
                  id="smallest-text"
                  value={formData.smallest_text}
                  onChange={(e) => setFormData({ ...formData, smallest_text: e.target.value })}
                  placeholder="e.g., 3mm"
                />
              </div>
            </TabsContent>

            {/* Use Case Tab */}
            <TabsContent value="usecase" className="space-y-4 mt-0">
              <div>
                <Label>Vision Use Cases</Label>
                <div className="grid grid-cols-1 gap-3 mt-2 max-h-96 overflow-y-auto border rounded-md p-3">
                  {Object.entries(
                    masterData.visionUseCases.reduce((acc, useCase) => {
                      const category = useCase.category || "Uncategorized";
                      if (!acc[category]) acc[category] = [];
                      acc[category].push(useCase);
                      return acc;
                    }, {} as Record<string, typeof masterData.visionUseCases>)
                  ).map(([category, cases]) => (
                    <div key={category} className="space-y-2">
                      <h4 className="text-sm font-semibold text-foreground border-b pb-1">
                        {category}
                      </h4>
                      <div className="space-y-2 pl-2">
                        {cases.map((useCase) => (
                          <div key={useCase.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`usecase-${useCase.id}`}
                              checked={formData.use_case_ids.includes(useCase.id)}
                              onCheckedChange={() => toggleUseCase(useCase.id)}
                            />
                            <Label
                              htmlFor={`usecase-${useCase.id}`}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {useCase.name}
                              {useCase.description && (
                                <span className="text-xs text-muted-foreground block">
                                  {useCase.description}
                                </span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="usecase-description">Description</Label>
                <Textarea
                  id="usecase-description"
                  value={formData.use_case_description}
                  onChange={(e) => setFormData({ ...formData, use_case_description: e.target.value })}
                  placeholder="Enter additional details about the use case"
                  rows={4}
                />
              </div>
              <div>
                <Label>Attributes</Label>
                <div className="space-y-2 mt-2">
                  {formData.attributes.map((attr) => (
                    <div key={attr.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <Label className="text-sm font-medium">Attribute</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAttribute(attr.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={attr.title}
                        onChange={(e) => updateAttribute(attr.id, "title", e.target.value)}
                        placeholder="Attribute title"
                      />
                      <Textarea
                        value={attr.description}
                        onChange={(e) => updateAttribute(attr.id, "description", e.target.value)}
                        placeholder="Attribute description"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAttribute}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Attribute
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Camera View Tab */}
            <TabsContent value="cameraview" className="space-y-4 mt-0">
              <div>
                <Label htmlFor="product-flow">Product Flow</Label>
                <Input
                  id="product-flow"
                  value={formData.product_flow}
                  onChange={(e) => setFormData({ ...formData, product_flow: e.target.value })}
                  placeholder="e.g., Single file, Flow Wrap, Multi product"
                />
              </div>
              <div>
                <Label htmlFor="camera-view-description">Description</Label>
                <Textarea
                  id="camera-view-description"
                  value={formData.camera_view_description}
                  onChange={(e) =>
                    setFormData({ ...formData, camera_view_description: e.target.value })
                  }
                  placeholder="Enter details about the camera view"
                  rows={4}
                />
              </div>
            </TabsContent>
          </div>

          <div className="pt-4 border-t flex-shrink-0">
            <Button onClick={handleSave} className="w-full">
              {mode === "edit" ? "Update Camera" : "Add Camera"}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
