import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Camera, Cpu } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Equipment {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  equipment_type?: string;
  titles: Array<{ id: string; title: "RLE" | "OP" }>;
  cameras: Array<{
    id: string;
    camera_type: string;
    lens_type: string;
    mac_address: string;
  }>;
  iot_devices: Array<{
    id: string;
    mac_address: string;
    receiver_mac_address: string;
  }>;
}

interface DeviceAssignmentProps {
  equipment: Equipment[];
  setEquipment: (equipment: Equipment[]) => void;
}

export const DeviceAssignment: React.FC<DeviceAssignmentProps> = ({
  equipment,
  setEquipment,
}) => {
  const [selectedEquipment, setSelectedEquipment] = useState<string>("");
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [deviceType, setDeviceType] = useState<"camera" | "iot">("camera");

  // Camera form state
  const [cameraForm, setCameraForm] = useState({
    camera_type: "",
    lens_type: "",
    mac_address: "",
  });

  // IoT form state
  const [iotForm, setIotForm] = useState({
    mac_address: "",
    receiver_mac_address: "",
  });

  const addCamera = () => {
    if (!selectedEquipment || !cameraForm.camera_type || !cameraForm.lens_type || !cameraForm.mac_address) {
      return;
    }

    const newCamera = {
      id: Math.random().toString(36).substring(7),
      ...cameraForm,
    };

    setEquipment(
      equipment.map((eq) =>
        eq.id === selectedEquipment
          ? { ...eq, cameras: [...eq.cameras, newCamera] }
          : eq
      )
    );

    setCameraForm({ camera_type: "", lens_type: "", mac_address: "" });
    setDeviceDialogOpen(false);
  };

  const addIotDevice = () => {
    if (!selectedEquipment || !iotForm.mac_address || !iotForm.receiver_mac_address) {
      return;
    }

    const newIotDevice = {
      id: Math.random().toString(36).substring(7),
      ...iotForm,
    };

    setEquipment(
      equipment.map((eq) =>
        eq.id === selectedEquipment
          ? { ...eq, iot_devices: [...eq.iot_devices, newIotDevice] }
          : eq
      )
    );

    setIotForm({ mac_address: "", receiver_mac_address: "" });
    setDeviceDialogOpen(false);
  };

  const removeCamera = (equipmentId: string, cameraId: string) => {
    setEquipment(
      equipment.map((eq) =>
        eq.id === equipmentId
          ? { ...eq, cameras: eq.cameras.filter((cam) => cam.id !== cameraId) }
          : eq
      )
    );
  };

  const removeIotDevice = (equipmentId: string, deviceId: string) => {
    setEquipment(
      equipment.map((eq) =>
        eq.id === equipmentId
          ? { ...eq, iot_devices: eq.iot_devices.filter((dev) => dev.id !== deviceId) }
          : eq
      )
    );
  };

  const openDeviceDialog = (equipmentId: string, type: "camera" | "iot") => {
    setSelectedEquipment(equipmentId);
    setDeviceType(type);
    setDeviceDialogOpen(true);
  };

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
          {equipment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No equipment available. Please add equipment in the process flow step.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {equipment.map((eq) => (
                <Card key={eq.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">{eq.name}</h3>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeviceDialog(eq.id, "camera")}
                          >
                            <Camera className="mr-1 h-3 w-3" />
                            Add Camera
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeviceDialog(eq.id, "iot")}
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
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="outline">{camera.camera_type}</Badge>
                                  <Badge variant="outline">{camera.lens_type}</Badge>
                                  <Badge variant="secondary">{camera.mac_address}</Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeCamera(eq.id, camera.id)}
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
                                <div className="flex gap-2 flex-wrap">
                                  <Badge variant="secondary">{device.mac_address}</Badge>
                                  <Badge variant="outline">→ {device.receiver_mac_address}</Badge>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeIotDevice(eq.id, device.id)}
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
                <Label htmlFor="camera-type">Camera Type</Label>
                <Input
                  id="camera-type"
                  value={cameraForm.camera_type}
                  onChange={(e) =>
                    setCameraForm({ ...cameraForm, camera_type: e.target.value })
                  }
                  placeholder="e.g., Industrial, PTZ, Fixed"
                />
              </div>
              <div>
                <Label htmlFor="lens-type">Lens Type</Label>
                <Input
                  id="lens-type"
                  value={cameraForm.lens_type}
                  onChange={(e) =>
                    setCameraForm({ ...cameraForm, lens_type: e.target.value })
                  }
                  placeholder="e.g., Wide Angle, Telephoto, Standard"
                />
              </div>
              <div>
                <Label htmlFor="camera-mac">MAC Address</Label>
                <Input
                  id="camera-mac"
                  value={cameraForm.mac_address}
                  onChange={(e) =>
                    setCameraForm({ ...cameraForm, mac_address: e.target.value })
                  }
                  placeholder="XX:XX:XX:XX:XX:XX"
                />
              </div>
              <Button onClick={addCamera} className="w-full">
                Add Camera
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="iot-mac">MAC Address</Label>
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
                <Label htmlFor="receiver-mac">Receiver MAC Address</Label>
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