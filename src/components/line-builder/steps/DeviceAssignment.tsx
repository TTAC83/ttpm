import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Camera, Cpu } from "lucide-react";
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
    mac_address: string;
    light_required?: boolean;
    light_id?: string;
  }>;
  iot_devices: Array<{
    id: string;
    name: string;
    hardware_master_id: string;
    mac_address: string;
    receiver_mac_address: string;
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

interface DeviceAssignmentProps {
  positions: Position[];
  setPositions: (positions: Position[]) => void;
}

export const DeviceAssignment: React.FC<DeviceAssignmentProps> = ({
  positions,
  setPositions,
}) => {
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<"camera" | "iot">("camera");
  const [lights, setLights] = useState<Light[]>([]);
  const [cameras, setCameras] = useState<CameraMaster[]>([]);
  const [lenses, setLenses] = useState<LensMaster[]>([]);
  const [plcs, setPlcs] = useState<PlcMaster[]>([]);
  const [iotDevices, setIotDevices] = useState<HardwareMaster[]>([]);

  // Camera form state
  const [cameraForm, setCameraForm] = useState({
    name: "",
    camera_master_id: "",
    lens_master_id: "",
    mac_address: "",
    light_required: false,
    light_id: "",
    plc_attached: false,
    plc_master_id: "",
  });

  // IoT form state
  const [iotForm, setIotForm] = useState({
    name: "",
    hardware_master_id: "",
    mac_address: "",
    receiver_mac_address: "",
  });

  // Fetch lights, cameras, lenses, PLCs, and IoT devices for the dropdowns
  useEffect(() => {
    const fetchData = async () => {
      const [lightsData, camerasData, lensesData, plcsData, iotDevicesData] = await Promise.all([
        supabase
          .from('lights')
          .select('id, manufacturer, model_number, description')
          .order('manufacturer', { ascending: true }),
        supabase
          .from('cameras_master')
          .select('id, manufacturer, model_number, camera_type')
          .order('manufacturer', { ascending: true }),
        supabase
          .from('lens_master')
          .select('id, manufacturer, model_number, lens_type, focal_length')
          .order('manufacturer', { ascending: true }),
        supabase
          .from('plc_master')
          .select('id, manufacturer, model_number, plc_type')
          .order('manufacturer', { ascending: true }),
        supabase
          .from('hardware_master')
          .select('id, sku_no, product_name, hardware_type, description')
          .eq('hardware_type', 'IoT Device')
          .order('product_name', { ascending: true })
      ]);
      
      if (lightsData.data) {
        setLights(lightsData.data);
      }
      if (camerasData.data) {
        setCameras(camerasData.data);
      }
      if (lensesData.data) {
        setLenses(lensesData.data);
      }
      if (plcsData.data) {
        setPlcs(plcsData.data);
      }
      if (iotDevicesData.data) {
        setIotDevices(iotDevicesData.data);
      }
    };

    fetchData();
  }, []);

  const addCamera = () => {
    if (!selectedPosition || !selectedEquipment || !cameraForm.name || !cameraForm.camera_master_id) {
      return;
    }

    const selectedCamera = cameras.find(c => c.id === cameraForm.camera_master_id);
    const selectedLens = lenses.find(l => l.id === cameraForm.lens_master_id);
    const newCamera = {
      id: Math.random().toString(36).substring(7),
      name: cameraForm.name,
      camera_type: selectedCamera?.camera_type || "",
      lens_type: selectedLens?.lens_type || "",
      mac_address: cameraForm.mac_address,
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
      lens_master_id: "",
      mac_address: "",
      light_required: false,
      light_id: "",
      plc_attached: false,
      plc_master_id: ""
    });
    setDeviceDialogOpen(false);
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

    setIotForm({ name: "", hardware_master_id: "", mac_address: "", receiver_mac_address: "" });
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
                                    <Badge variant="outline">{camera.lens_type}</Badge>
                                    {camera.mac_address && (
                                      <Badge variant="secondary">{camera.mac_address}</Badge>
                                    )}
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
                                   <div className="flex gap-2 flex-wrap">
                                     {device.mac_address && (
                                       <Badge variant="secondary">{device.mac_address}</Badge>
                                     )}
                                     {device.receiver_mac_address && (
                                       <Badge variant="outline">→ {device.receiver_mac_address}</Badge>
                                     )}
                                   </div>
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
              <div>
                <Label htmlFor="camera-name">Camera Name</Label>
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
                <Label htmlFor="camera-model">Camera Model</Label>
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
              
              <div>
                <Label htmlFor="lens-model">Lens Model</Label>
                <Select
                  value={cameraForm.lens_master_id}
                  onValueChange={(value) =>
                    setCameraForm({ ...cameraForm, lens_master_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose lens model" />
                  </SelectTrigger>
                  <SelectContent>
                    {lenses.map((lens) => (
                      <SelectItem key={lens.id} value={lens.id}>
                        {lens.manufacturer} - {lens.model_number}
                        {lens.lens_type && ` (${lens.lens_type})`}
                        {lens.focal_length && ` - ${lens.focal_length}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="camera-mac">MAC Address (Optional)</Label>
                <Input
                  id="camera-mac"
                  value={cameraForm.mac_address}
                  onChange={(e) =>
                    setCameraForm({ ...cameraForm, mac_address: e.target.value })
                  }
                  placeholder="XX:XX:XX:XX:XX:XX"
                />
              </div>
              
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
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="plc-attached"
                  checked={cameraForm.plc_attached}
                  onCheckedChange={(checked) =>
                    setCameraForm({ 
                      ...cameraForm, 
                      plc_attached: !!checked,
                      plc_master_id: checked ? cameraForm.plc_master_id : ""
                    })
                  }
                />
                <Label htmlFor="plc-attached">PLC Attached</Label>
              </div>
              
              {cameraForm.plc_attached && (
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
              )}
              
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
                <Label htmlFor="iot-mac">MAC Address (Optional)</Label>
                <Input
                  id="iot-mac"
                  value={iotForm.mac_address}
                  onChange={(e) =>
                    setIotForm({ ...iotForm, mac_address: e.target.value })
                  }
                  placeholder="XX:XX:XX:XX:XX:XX"
                />
              </div>
              <div>
                <Label htmlFor="receiver-mac">Receiver MAC Address (Optional)</Label>
                <Input
                  id="receiver-mac"
                  value={iotForm.receiver_mac_address}
                  onChange={(e) =>
                    setIotForm({ ...iotForm, receiver_mac_address: e.target.value })
                  }
                  placeholder="XX:XX:XX:XX:XX:XX"
                />
              </div>
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