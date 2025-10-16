import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus, Trash2, Camera, Cpu, Lightbulb, Cpu as CpuIcon, Monitor } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";

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
    camera_type: string;
    lens_type: string;
    light_required?: boolean;
    light_id?: string;
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
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<"camera" | "iot">("camera");
  const [lights, setLights] = useState<Light[]>([]);
  const [cameras, setCameras] = useState<CameraMaster[]>([]);
  const [plcs, setPlcs] = useState<PlcMaster[]>([]);
  const [hmis, setHmis] = useState<HardwareMaster[]>([]);
  const [iotDevices, setIotDevices] = useState<HardwareMaster[]>([]);
  const [receivers, setReceivers] = useState<ReceiverMaster[]>([]);
  const [cts, setCts] = useState<HardwareMaster[]>([]);

  // Camera form state
  const [cameraForm, setCameraForm] = useState({
    name: "",
    camera_master_id: "",
    light_required: false,
    light_id: "",
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
  });

  // IoT form state
  const [iotForm, setIotForm] = useState({
    name: "",
    hardware_master_id: "",
    receiver_master_id: "",
    energy_monitoring: false,
    ct_master_id: "",
  });

  // Fetch lights, cameras, PLCs, HMIs, IoT devices, receivers, and CTs for the dropdowns
  useEffect(() => {
    const fetchData = async () => {
      const [camerasData, lightsData, plcsData, hmisData, iotDevicesData, ctsData] = await Promise.all([
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'Camera')
          .order('product_name', { ascending: true }),
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'Light')
          .order('product_name', { ascending: true }),
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'PLC')
          .order('product_name', { ascending: true }),
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'HMI')
          .order('product_name', { ascending: true }),
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'IoT Device')
          .order('product_name', { ascending: true }),
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'CTs')
          .order('product_name', { ascending: true })
      ]);
      
      if (camerasData.data) {
        setCameras(camerasData.data.map(item => ({
          id: item.id,
          manufacturer: item.product_name,
          model_number: item.sku_no,
          camera_type: item.description || ''
        })));
      }
      if (lightsData.data) {
        setLights(lightsData.data.map(item => ({
          id: item.id,
          manufacturer: item.product_name,
          model_number: item.sku_no,
          description: item.description
        })));
      }
      if (plcsData.data) {
        setPlcs(plcsData.data.map(item => ({
          id: item.id,
          manufacturer: item.product_name,
          model_number: item.sku_no,
          plc_type: item.description || ''
        })));
      }
      if (hmisData.data) {
        setHmis(hmisData.data);
      }
      if (iotDevicesData.data) {
        setIotDevices(iotDevicesData.data);
      }
      if (ctsData.data) {
        setCts(ctsData.data);
      }

      // Fetch receivers separately based on whether we have a solutions project
      if (solutionsProjectId) {
        const { data: receiversData } = await supabase
          .from('project_iot_requirements')
          .select('id, name')
          .eq('solutions_project_id', solutionsProjectId)
          .eq('hardware_type', 'receiver');

        if (receiversData) {
          const transformedReceivers = receiversData.map((item: any) => ({
            id: item.id,
            manufacturer: item.name,
            model_number: '',
            receiver_type: ''
          }));
          setReceivers(transformedReceivers);
        }
      } else {
        const { data: receiversData } = await supabase
          .from('receivers_master')
          .select('id, manufacturer, model_number, receiver_type')
          .order('manufacturer', { ascending: true });

        if (receiversData) {
          setReceivers(receiversData);
        }
      }
    };

    fetchData();
  }, [solutionsProjectId]);

  const addCamera = () => {
    if (!selectedPosition || !selectedEquipment || !cameraForm.name || !cameraForm.camera_master_id) {
      return;
    }

    const selectedCamera = cameras.find(c => c.id === cameraForm.camera_master_id);
    const newCamera = {
      id: Math.random().toString(36).substring(7),
      name: cameraForm.name,
      camera_type: selectedCamera?.camera_type || "",
      lens_type: "",
      light_required: cameraForm.light_required,
      light_id: cameraForm.light_id,
      plc_attached: cameraForm.plc_attached,
      plc_master_id: cameraForm.plc_master_id,
    };

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

    setCameraForm({ 
      name: "", 
      camera_master_id: "", 
      light_required: false,
      light_id: "",
      plc_attached: false,
      plc_master_id: "",
      relay_outputs: [],
      hmi_required: false,
      hmi_master_id: ""
    });
    setDeviceDialogOpen(false);
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

    setIotForm({ name: "", hardware_master_id: "", receiver_master_id: "", energy_monitoring: false, ct_master_id: "" });
    setDeviceDialogOpen(false);
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

  const openDeviceDialog = (positionId: string, equipmentId: string, type: "camera" | "iot") => {
    setSelectedPosition(positionId);
    setSelectedEquipment(equipmentId);
    setDeviceType(type);
    setDeviceDialogOpen(true);
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
                            onClick={() => openDeviceDialog(eq.positionId, eq.id, "camera")}
                          >
                            <Camera className="mr-1 h-3 w-3" />
                            Add Camera
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeviceDialog(eq.positionId, eq.id, "iot")}
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
                            {eq.cameras.map((camera) => (
                              <div
                                key={camera.id}
                                className="flex items-center justify-between bg-muted/50 p-3 rounded-lg"
                              >
                                 <div className="flex flex-col gap-1">
                                   <div className="font-medium text-sm">{camera.name}</div>
                                   <div className="flex gap-2 flex-wrap">
                                     <Badge variant="outline">{camera.camera_type}</Badge>
                                   </div>
                                 </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCamera(eq.positionId, eq.id, camera.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
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
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeIotDevice(eq.positionId, eq.id, device.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
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

      {/* Device Dialog */}
      <Dialog open={deviceDialogOpen} onOpenChange={setDeviceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Add {deviceType === "camera" ? "Camera" : "IoT Device"}
            </DialogTitle>
          </DialogHeader>

          {deviceType === "camera" ? (
            <div className="space-y-4">
              {/* Basic Info - Always Visible */}
              <div className="space-y-4 pb-4 border-b">
                <div>
                  <Label htmlFor="camera-name">Camera Name *</Label>
                  <Input
                    id="camera-name"
                    value={cameraForm.name}
                    onChange={(e) =>
                      setCameraForm({ ...cameraForm, name: e.target.value })
                    }
                    placeholder="Enter camera name"
                  />
                </div>
                <div>
                  <Label htmlFor="camera-model">Camera Model *</Label>
                  <Select
                    value={cameraForm.camera_master_id}
                    onValueChange={(value) =>
                      setCameraForm({ ...cameraForm, camera_master_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose camera model" />
                    </SelectTrigger>
                    <SelectContent>
                      {cameras.map((camera) => (
                        <SelectItem key={camera.id} value={camera.id}>
                          {camera.manufacturer} - {camera.model_number}
                          {camera.camera_type && ` (${camera.camera_type})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Accordion Sections */}
              <Accordion type="multiple" className="w-full">
                {/* Lighting Configuration */}
                <AccordionItem value="lighting">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      <span>Lighting Configuration</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="light-required"
                        checked={cameraForm.light_required}
                        onCheckedChange={(checked) =>
                          setCameraForm({ 
                            ...cameraForm, 
                            light_required: !!checked,
                            light_id: checked ? cameraForm.light_id : ""
                          })
                        }
                      />
                      <Label htmlFor="light-required">Light Required</Label>
                    </div>
                    
                    {cameraForm.light_required && (
                      <div>
                        <Label htmlFor="light-select">Select Light Model</Label>
                        <Select
                          value={cameraForm.light_id}
                          onValueChange={(value) =>
                            setCameraForm({ ...cameraForm, light_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose light model" />
                          </SelectTrigger>
                          <SelectContent>
                            {lights.map((light) => (
                              <SelectItem key={light.id} value={light.id}>
                                {light.manufacturer} - {light.model_number}
                                {light.description && ` (${light.description})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* PLC Configuration */}
                <AccordionItem value="plc">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <CpuIcon className="h-4 w-4" />
                      <span>PLC Configuration</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="plc-attached"
                        checked={cameraForm.plc_attached}
                        onCheckedChange={(checked) =>
                          setCameraForm({ 
                            ...cameraForm, 
                            plc_attached: !!checked,
                            plc_master_id: checked ? cameraForm.plc_master_id : "",
                            relay_outputs: checked ? cameraForm.relay_outputs : []
                          })
                        }
                      />
                      <Label htmlFor="plc-attached">PLC Attached</Label>
                    </div>
                    
                    {cameraForm.plc_attached && (
                      <>
                        <div>
                          <Label htmlFor="plc-select">Select PLC Model</Label>
                          <Select
                            value={cameraForm.plc_master_id}
                            onValueChange={(value) =>
                              setCameraForm({ ...cameraForm, plc_master_id: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose PLC model" />
                            </SelectTrigger>
                            <SelectContent>
                              {plcs.map((plc) => (
                                <SelectItem key={plc.id} value={plc.id}>
                                  {plc.manufacturer} - {plc.model_number}
                                  {plc.plc_type && ` (${plc.plc_type})`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <Label>Relay Outputs</Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={addRelayOutput}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Output
                            </Button>
                          </div>

                          {cameraForm.relay_outputs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No relay outputs added</p>
                          ) : (
                            <div className="space-y-3">
                              {cameraForm.relay_outputs.map((output) => (
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
                                        onValueChange={(value) =>
                                          updateRelayOutput(output.id, 'type', value)
                                        }
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
                                          updateRelayOutput(output.id, 'custom_name', e.target.value)
                                        }
                                        placeholder="Enter custom name"
                                      />
                                    </div>

                                    <div>
                                      <Label htmlFor={`output-notes-${output.id}`}>Notes (Optional)</Label>
                                      <Textarea
                                        id={`output-notes-${output.id}`}
                                        value={output.notes}
                                        onChange={(e) =>
                                          updateRelayOutput(output.id, 'notes', e.target.value)
                                        }
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
                    )}
                  </AccordionContent>
                </AccordionItem>

                {/* HMI Configuration */}
                <AccordionItem value="hmi">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      <span>HMI Configuration</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hmi-required"
                        checked={cameraForm.hmi_required}
                        onCheckedChange={(checked) =>
                          setCameraForm({ 
                            ...cameraForm, 
                            hmi_required: !!checked,
                            hmi_master_id: checked ? cameraForm.hmi_master_id : ""
                          })
                        }
                      />
                      <Label htmlFor="hmi-required">HMI Required</Label>
                    </div>
                    
                    {cameraForm.hmi_required && (
                      <div>
                        <Label htmlFor="hmi-select">Select HMI Model</Label>
                        <Select
                          value={cameraForm.hmi_master_id}
                          onValueChange={(value) =>
                            setCameraForm({ ...cameraForm, hmi_master_id: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Choose HMI model" />
                          </SelectTrigger>
                          <SelectContent>
                            {hmis.map((hmi) => (
                              <SelectItem key={hmi.id} value={hmi.id}>
                                {hmi.sku_no} - {hmi.product_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <Button onClick={addCamera} className="w-full">
                Add Camera
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  value={iotForm.name}
                  onChange={(e) =>
                    setIotForm({ ...iotForm, name: e.target.value })
                  }
                  placeholder="Enter device name"
                />
              </div>
              
              <div>
                <Label htmlFor="iot-device-model">IoT Device Model</Label>
                <Select
                  value={iotForm.hardware_master_id}
                  onValueChange={(value) =>
                    setIotForm({ ...iotForm, hardware_master_id: value })
                  }
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
                  onValueChange={(value) =>
                    setIotForm({ ...iotForm, receiver_master_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose receiver model" />
                  </SelectTrigger>
                  <SelectContent>
                    {receivers.map((receiver) => (
                      <SelectItem key={receiver.id} value={receiver.id}>
                        {receiver.manufacturer}
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
                      ct_master_id: checked ? iotForm.ct_master_id : ""
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
                    onValueChange={(value) =>
                      setIotForm({ ...iotForm, ct_master_id: value })
                    }
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
                Add IoT Device
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};