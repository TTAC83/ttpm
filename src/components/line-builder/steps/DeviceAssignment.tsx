import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Camera, Cpu, Edit, Lightbulb, Monitor } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CameraConfigDialog } from "@/components/shared/CameraConfigDialog";
import { useMasterDataCache } from "@/hooks/useMasterDataCache";
import { useToast } from "@/hooks/use-toast";

interface Position {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  titles: Array<{ id: string; title: "RLE" | "OP" }>;
  equipment: Equipment[];
}

interface Equipment {
  id: string;
  name: string;
  equipment_type?: string;
  cameras: Array<{
    id: string;
    name: string;
    camera_ip?: string;
    camera_type: string;
    lens_type: string;
    light_required?: boolean;
    light_id?: string;
    light_notes?: string;
    plc_attached?: boolean;
    plc_master_id?: string;
    relay_outputs?: Array<{
      id: string;
      output_number: number;
      type: string;
      custom_name: string;
      notes: string;
    }>;
    hmi_required?: boolean;
    hmi_master_id?: string;
    hmi_notes?: string;
    horizontal_fov?: string;
    working_distance?: string;
    smallest_text?: string;
    use_case_ids?: string[];
    use_case_description?: string;
    attributes?: Array<{
      id: string;
      title: string;
      description: string;
    }>;
    product_flow?: string;
    camera_view_description?: string;
  }>;
  iot_devices: Array<{
    id: string;
    name: string;
    hardware_master_id: string;
    receiver_master_id?: string;
  }>;
}

interface Light {
  id: string;
  manufacturer: string;
  model_number: string;
  description?: string;
}

interface CameraMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  camera_type?: string;
}

interface LensMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  lens_type?: string;
  focal_length?: string;
}

interface PlcMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  plc_type?: string;
}

interface HardwareMaster {
  id: string;
  sku_no: string;
  product_name: string;
  hardware_type: string;
  description?: string;
}

interface ReceiverMaster {
  id: string;
  manufacturer: string;
  model_number: string;
  receiver_type?: string;
}

interface DeviceAssignmentProps {
  positions: Position[];
  setPositions: (positions: Position[]) => void;
  solutionsProjectId?: string;
}

export const DeviceAssignment: React.FC<DeviceAssignmentProps> = ({
  positions,
  setPositions,
  solutionsProjectId,
}) => {
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [iotDialogOpen, setIotDialogOpen] = useState(false);
  const [cameraEditMode, setCameraEditMode] = useState(false);
  const [editingCameraId, setEditingCameraId] = useState<string>("");
  const [editingIotId, setEditingIotId] = useState<string>("");
  const [iotDevices, setIotDevices] = useState<HardwareMaster[]>([]);
  const [receivers, setReceivers] = useState<ReceiverMaster[]>([]);
  const [cts, setCts] = useState<HardwareMaster[]>([]);
  const { toast } = useToast();
  
  // Use cached master data
  const masterData = useMasterDataCache();
  const { cameras, lenses, lights, plcs, hmis, visionUseCases } = masterData;

  // Camera form state
  const [cameraForm, setCameraForm] = useState({
    name: "",
    camera_ip: "",
    camera_type: "",
    lens_type: "",
    light_required: false,
    light_id: "",
    light_notes: "",
    plc_attached: false,
    plc_master_id: "",
    relay_outputs: [] as Array<{
      id: string;
      output_number: number;
      type: string;
      custom_name: string;
      notes: string;
    }>,
    hmi_required: false,
    hmi_master_id: "",
    hmi_notes: "",
    // New fields for measurements
    horizontal_fov: "",
    working_distance: "",
    smallest_text: "",
    // New fields for use cases
    use_case_ids: [] as string[],
    use_case_description: "",
    // New fields for attributes
    attributes: [] as Array<{
      id: string;
      title: string;
      description: string;
    }>,
    // New fields for camera view
    product_flow: "",
    camera_view_description: "",
  });
  
  // IoT form state
  const [iotForm, setIotForm] = useState({
    name: "",
    hardware_master_id: "",
    receiver_master_id: "",
    energy_monitoring: false,
    ct_master_id: "",
  });

  // Fetch IoT devices, receivers, and CTs (non-cached data)
  useEffect(() => {
    const fetchData = async () => {
      const [iotDevicesData, ctsData] = await Promise.all([
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'IoT Device')
          .order('product_name', { ascending: true }),
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'CTs')
          .order('product_name', { ascending: true }),
      ]);
      if (iotDevicesData.data) {
        setIotDevices(iotDevicesData.data);
      }
      if (ctsData.data) {
        setCts(ctsData.data);
      }

      // Fetch receivers from project_iot_requirements based on project type
      if (solutionsProjectId) {
        const { data: receiversData } = await supabase
          .from('project_iot_requirements')
          .select('id, name')
          .eq('solutions_project_id', solutionsProjectId)
          .eq('hardware_type', 'receiver');

        if (receiversData) {
          const transformedReceivers = receiversData.map((item: any) => ({
            id: item.id,
            manufacturer: '',
            model_number: item.name || 'Unnamed Receiver',
            receiver_type: ''
          }));
          setReceivers(transformedReceivers);
        }
      } else {
        const { data: receiversData } = await supabase
          .from('project_iot_requirements')
          .select('id, name')
          .eq('project_id', solutionsProjectId)
          .eq('hardware_type', 'receiver');

        if (receiversData) {
          const transformedReceivers = receiversData.map((item: any) => ({
            id: item.id,
            manufacturer: '',
            model_number: item.name || 'Unnamed Receiver',
            receiver_type: ''
          }));
          setReceivers(transformedReceivers);
        }
      }
    };

    fetchData();
  }, [solutionsProjectId]);

  const addCamera = (formData: any) => {
    console.log("addCamera called with formData:", formData);
    
    if (!selectedPosition || !selectedEquipment) {
      toast({
        title: "Error",
        description: "Please select equipment first",
        variant: "destructive",
      });
      return;
    }

    // Camera name and type are not mandatory — gaps are tracked via the line completeness indicator

    const selectedCamera = cameras.find(c => c.id === formData.camera_type);
    
    if (cameraEditMode && editingCameraId) {
      // Update existing camera
      setPositions(
        positions.map((position) =>
          position.id === selectedPosition
            ? {
                ...position,
                equipment: position.equipment.map((eq) =>
                  eq.id === selectedEquipment
                    ? { 
                        ...eq, 
                        cameras: eq.cameras.map(cam => 
                          cam.id === editingCameraId
                            ? {
                                ...cam,
                                name: formData.name,
                                camera_type: formData.camera_type,
                                lens_type: formData.lens_type,
                                light_required: formData.light_required,
                                light_id: formData.light_id,
                                light_notes: formData.light_notes,
                                plc_attached: formData.plc_attached,
                                plc_master_id: formData.plc_master_id,
                                relay_outputs: formData.relay_outputs,
                                hmi_required: formData.hmi_required,
                                hmi_master_id: formData.hmi_master_id,
                                hmi_notes: formData.hmi_notes,
                                horizontal_fov: formData.horizontal_fov,
                                working_distance: formData.working_distance,
                                smallest_text: formData.smallest_text,
                                use_case_ids: formData.use_case_ids,
                                use_case_description: formData.use_case_description,
                                attributes: formData.attributes,
                                product_flow: formData.product_flow,
                                camera_view_description: formData.camera_view_description,
                              }
                            : cam
                        )
                      }
                    : eq
                ),
              }
            : position
        )
      );
    } else {
      // Add new camera
      const newCamera = {
        id: Math.random().toString(36).substring(7),
        name: formData.name,
        camera_type: formData.camera_type,
        lens_type: formData.lens_type,
        light_required: formData.light_required,
        light_id: formData.light_id,
        light_notes: formData.light_notes,
        plc_attached: formData.plc_attached,
        plc_master_id: formData.plc_master_id,
        relay_outputs: formData.relay_outputs,
        hmi_required: formData.hmi_required,
        hmi_master_id: formData.hmi_master_id,
        hmi_notes: formData.hmi_notes,
        horizontal_fov: formData.horizontal_fov,
        working_distance: formData.working_distance,
        smallest_text: formData.smallest_text,
        use_case_ids: formData.use_case_ids,
        use_case_description: formData.use_case_description,
        attributes: formData.attributes,
        product_flow: formData.product_flow,
        camera_view_description: formData.camera_view_description,
      };

      console.log("Adding new camera:", newCamera);

      setPositions(
        positions.map((position) =>
          position.id === selectedPosition
            ? {
                ...position,
                equipment: position.equipment.map((eq) =>
                  eq.id === selectedEquipment
                    ? { ...eq, cameras: [...eq.cameras, newCamera] }
                    : eq
                ),
              }
            : position
        )
      );
    }

    resetCameraForm();
    setCameraDialogOpen(false);
    
    toast({
      title: "Success",
      description: cameraEditMode ? "Camera updated successfully" : "Camera added successfully",
    });
  };

  const resetCameraForm = () => {
    setCameraForm({
      name: "",
      camera_ip: "",
      camera_type: "",
      lens_type: "",
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
    });
    setCameraEditMode(false);
    setEditingCameraId("");
  };

  const addAttribute = () => {
    const newAttribute = {
      id: Math.random().toString(36).substring(7),
      title: "",
      description: ""
    };
    setCameraForm({
      ...cameraForm,
      attributes: [...cameraForm.attributes, newAttribute]
    });
  };

  const updateAttribute = (id: string, field: "title" | "description", value: string) => {
    setCameraForm({
      ...cameraForm,
      attributes: cameraForm.attributes.map(attr =>
        attr.id === id ? { ...attr, [field]: value } : attr
      )
    });
  };

  const deleteAttribute = (id: string) => {
    setCameraForm({
      ...cameraForm,
      attributes: cameraForm.attributes.filter(attr => attr.id !== id)
    });
  };

  const toggleUseCase = (useCaseId: string) => {
    setCameraForm({
      ...cameraForm,
      use_case_ids: cameraForm.use_case_ids.includes(useCaseId)
        ? cameraForm.use_case_ids.filter(id => id !== useCaseId)
        : [...cameraForm.use_case_ids, useCaseId]
    });
  };

  const addRelayOutput = () => {
    const newOutput = {
      id: Math.random().toString(36).substring(7),
      output_number: cameraForm.relay_outputs.length + 1,
      type: "",
      custom_name: "",
      notes: ""
    };
    setCameraForm({
      ...cameraForm,
      relay_outputs: [...cameraForm.relay_outputs, newOutput]
    });
  };

  const updateRelayOutput = (id: string, field: string, value: string) => {
    setCameraForm({
      ...cameraForm,
      relay_outputs: cameraForm.relay_outputs.map(output =>
        output.id === id ? { ...output, [field]: value } : output
      )
    });
  };

  const deleteRelayOutput = (id: string) => {
    const updatedOutputs = cameraForm.relay_outputs
      .filter(output => output.id !== id)
      .map((output, index) => ({ ...output, output_number: index + 1 }));
    
    setCameraForm({
      ...cameraForm,
      relay_outputs: updatedOutputs
    });
  };

  const addIotDevice = () => {
    if (!selectedPosition || !selectedEquipment || !iotForm.name) {
      return;
    }

    if (editingIotId) {
      // Update existing IoT device
      setPositions(
        positions.map((position) =>
          position.id === selectedPosition
            ? {
                ...position,
                equipment: position.equipment.map((eq) =>
                  eq.id === selectedEquipment
                    ? { 
                        ...eq, 
                        iot_devices: eq.iot_devices.map(device => 
                          device.id === editingIotId
                            ? {
                                ...device,
                                name: iotForm.name,
                                hardware_master_id: iotForm.hardware_master_id,
                                receiver_master_id: iotForm.receiver_master_id,
                              }
                            : device
                        )
                      }
                    : eq
                ),
              }
            : position
        )
      );
    } else {
      // Add new IoT device
      const newIotDevice = {
        id: Math.random().toString(36).substring(7),
        ...iotForm,
      };

      setPositions(
        positions.map((position) =>
          position.id === selectedPosition
            ? {
                ...position,
                equipment: position.equipment.map((eq) =>
                  eq.id === selectedEquipment
                    ? { ...eq, iot_devices: [...eq.iot_devices, newIotDevice] }
                    : eq
                ),
              }
            : position
        )
      );
    }

    resetIotForm();
    setIotDialogOpen(false);
  };

  const resetIotForm = () => {
    setIotForm({ name: "", hardware_master_id: "", receiver_master_id: "", energy_monitoring: false, ct_master_id: "" });
    setEditingIotId("");
  };

  const removeCamera = (positionId: string, equipmentId: string, cameraId: string) => {
    setPositions(
      positions.map((position) =>
        position.id === positionId
          ? {
              ...position,
              equipment: position.equipment.map((eq) =>
                eq.id === equipmentId
                  ? { ...eq, cameras: eq.cameras.filter((cam) => cam.id !== cameraId) }
                  : eq
              ),
            }
          : position
      )
    );
  };

  const removeIotDevice = (positionId: string, equipmentId: string, deviceId: string) => {
    setPositions(
      positions.map((position) =>
        position.id === positionId
          ? {
              ...position,
              equipment: position.equipment.map((eq) =>
                eq.id === equipmentId
                  ? { ...eq, iot_devices: eq.iot_devices.filter((dev) => dev.id !== deviceId) }
                  : eq
              ),
            }
          : position
      )
    );
  };

  const openAddCameraDialog = (positionId: string, equipmentId: string) => {
    setSelectedPosition(positionId);
    setSelectedEquipment(equipmentId);
    setCameraEditMode(false);
    setEditingCameraId("");
    resetCameraForm();
    setCameraDialogOpen(true);
  };

  const openEditCameraDialog = (positionId: string, equipmentId: string, camera: any) => {
    setSelectedPosition(positionId);
    setSelectedEquipment(equipmentId);
    setCameraEditMode(true);
    setEditingCameraId(camera.id);
    
    // camera_type should be a UUID, if not, try to find by model
    const cameraMaster = cameras.find(c => c.id === camera.camera_type);
    
    setCameraForm({
      name: camera.name || "",
      camera_ip: camera.camera_ip || "",
      camera_type: camera.camera_type || "",
      lens_type: camera.lens_type || "",
      light_required: camera.light_required || false,
      light_id: camera.light_id || "",
      light_notes: camera.light_notes || "",
      plc_attached: camera.plc_attached || false,
      plc_master_id: camera.plc_master_id || "",
      relay_outputs: camera.relay_outputs || [],
      hmi_required: camera.hmi_required || false,
      hmi_master_id: camera.hmi_master_id || "",
      hmi_notes: camera.hmi_notes || "",
      horizontal_fov: camera.horizontal_fov || "",
      working_distance: camera.working_distance || "",
      smallest_text: camera.smallest_text || "",
      use_case_ids: camera.use_case_ids || [],
      use_case_description: camera.use_case_description || "",
      attributes: camera.attributes || [],
      product_flow: camera.product_flow || "",
      camera_view_description: camera.camera_view_description || "",
    });
    setCameraDialogOpen(true);
  };

  const openAddIotDialog = (positionId: string, equipmentId: string) => {
    setSelectedPosition(positionId);
    setSelectedEquipment(equipmentId);
    setEditingIotId("");
    resetIotForm();
    setIotDialogOpen(true);
  };

  const openEditIotDialog = (positionId: string, equipmentId: string, device: any) => {
    setSelectedPosition(positionId);
    setSelectedEquipment(equipmentId);
    setEditingIotId(device.id);
    
    setIotForm({
      name: device.name,
      hardware_master_id: device.hardware_master_id || "",
      receiver_master_id: device.receiver_master_id || "",
      energy_monitoring: false,
      ct_master_id: ""
    });
    setIotDialogOpen(true);
  };

  const handleCameraSave = (formData: typeof cameraForm) => {
    addCamera(formData);
  };

  const allEquipment = positions.flatMap((position) =>
    position.equipment.map((eq) => ({ ...eq, positionId: position.id, positionName: position.name }))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Device Assignment</CardTitle>
          <CardDescription>
            Add cameras and IoT devices to your equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allEquipment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No equipment available. Please add equipment in the process flow step.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {allEquipment.map((eq) => (
                <Card key={`${eq.positionId}-${eq.id}`} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{eq.name}</h3>
                          <p className="text-sm text-muted-foreground">Position: {eq.positionName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddCameraDialog(eq.positionId, eq.id)}
                          >
                            <Camera className="mr-1 h-3 w-3" />
                            Add Camera
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openAddIotDialog(eq.positionId, eq.id)}
                          >
                            <Cpu className="mr-1 h-3 w-3" />
                            Add IoT Device
                          </Button>
                        </div>
                      </div>

                       {/* Cameras */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Camera className="mr-1 h-4 w-4" />
                          Cameras ({eq.cameras.length})
                        </h4>
                        {eq.cameras.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No cameras assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {eq.cameras.map((camera) => {
                              const lightInfo = camera.light_id ? lights.find(l => l.id === camera.light_id) : null;
                              const plcInfo = camera.plc_master_id ? plcs.find(p => p.id === camera.plc_master_id) : null;
                              const hmiInfo = camera.hmi_master_id ? hmis.find(h => h.id === camera.hmi_master_id) : null;
                              
                              return (
                                <div
                                  key={camera.id}
                                  className="bg-muted/50 p-3 rounded-lg space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                      <div className="font-medium text-sm">{camera.name}</div>
                                      <div className="flex gap-2 flex-wrap">
                                        <Badge variant="outline">
                                          <Camera className="h-3 w-3 mr-1" />
                                          {cameras.find(c => c.id === camera.camera_type)?.model_number || camera.camera_type}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => openEditCameraDialog(eq.positionId, eq.id, camera)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCamera(eq.positionId, eq.id, camera.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* Vision Equipment Accessories */}
                                  {(lightInfo || plcInfo || hmiInfo) && (
                                    <div className="pl-4 border-l-2 border-primary/20 space-y-1">
                                      {lightInfo && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Lightbulb className="h-3 w-3" />
                                          <span>{lightInfo.manufacturer} - {lightInfo.model_number}</span>
                                        </div>
                                      )}
                                      {plcInfo && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Cpu className="h-3 w-3" />
                                          <span>{plcInfo.manufacturer} - {plcInfo.model_number}</span>
                                        </div>
                                      )}
                                      {hmiInfo && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                          <Monitor className="h-3 w-3" />
                                          <span>{hmiInfo.sku_no} - {hmiInfo.product_name}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* IoT Devices */}
                      <div>
                        <h4 className="font-medium mb-2 flex items-center">
                          <Cpu className="mr-1 h-4 w-4" />
                          IoT Devices ({eq.iot_devices.length})
                        </h4>
                        {eq.iot_devices.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No IoT devices assigned</p>
                        ) : (
                          <div className="space-y-2">
                            {eq.iot_devices.map((device) => (
                              <div
                                key={device.id}
                                className="flex items-center justify-between bg-muted/50 p-3 rounded-lg"
                              >
                                 <div className="flex flex-col gap-1">
                                   <div className="font-medium text-sm">{device.name}</div>
                                 </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openEditIotDialog(eq.positionId, eq.id, device)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeIotDevice(eq.positionId, eq.id, device.id)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Camera Config Dialog */}
      <CameraConfigDialog
        open={cameraDialogOpen}
        onOpenChange={setCameraDialogOpen}
        mode={cameraEditMode ? "edit" : "add"}
        cameraData={cameraForm}
        masterData={{
          cameras,
          lenses,
          lights,
          plcs,
          hmis,
          visionUseCases,
        }}
        onSave={handleCameraSave}
      />

      {/* IoT Device Dialog */}
      <Dialog open={iotDialogOpen} onOpenChange={setIotDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingIotId ? "Edit" : "Add"} IoT Device
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
            <Label htmlFor="device-name">Device Name</Label>
            <Input
              id="device-name"
              value={iotForm.name}
              onChange={(e) => setIotForm({ ...iotForm, name: e.target.value })}
              placeholder="Enter device name"
            />
          </div>

          <div>
            <Label htmlFor="iot-device-model">IoT Device Model</Label>
            <Select
              value={iotForm.hardware_master_id}
              onValueChange={(value) => setIotForm({ ...iotForm, hardware_master_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose IoT device from hardware master data" />
              </SelectTrigger>
              <SelectContent>
                {iotDevices.map((device) => (
                  <SelectItem key={device.id} value={device.id}>
                    {device.sku_no} - {device.product_name}
                    {device.hardware_type && ` (${device.hardware_type})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="receiver-model">Receiver (Optional)</Label>
            <Select
              value={iotForm.receiver_master_id}
              onValueChange={(value) => setIotForm({ ...iotForm, receiver_master_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose receiver model" />
              </SelectTrigger>
              <SelectContent>
                {receivers.map((receiver) => (
                  <SelectItem key={receiver.id} value={receiver.id}>
                    {receiver.model_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="energy-monitoring"
              checked={iotForm.energy_monitoring}
              onCheckedChange={(checked) =>
                setIotForm({
                  ...iotForm,
                  energy_monitoring: !!checked,
                  ct_master_id: checked ? iotForm.ct_master_id : "",
                })
              }
            />
            <Label htmlFor="energy-monitoring">Energy Monitoring</Label>
          </div>

          {iotForm.energy_monitoring && (
            <div>
              <Label htmlFor="ct-model">Select CT</Label>
              <Select
                value={iotForm.ct_master_id}
                onValueChange={(value) => setIotForm({ ...iotForm, ct_master_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose CT model" />
                </SelectTrigger>
                <SelectContent>
                  {cts.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.sku_no} - {ct.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={addIotDevice} className="w-full">
            {editingIotId ? "Update IoT Device" : "Add IoT Device"}
          </Button>
        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};