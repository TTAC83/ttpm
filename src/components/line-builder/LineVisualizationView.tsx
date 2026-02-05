import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Cpu, MapPin, Edit, Lightbulb, Monitor, Zap } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CameraConfigDialog } from "@/components/shared/CameraConfigDialog";
import { LineUseCasesTable } from "./LineUseCasesTable";

interface Camera {
  id: string;
  name: string;
  camera_type: string;
  lens_type: string;
  light_required?: boolean;
  light_id?: string;
  plc_master_id?: string;
  hmi_master_id?: string;
  use_cases?: Array<{
    id: string;
    vision_use_case_id: string;
    use_case_name?: string;
    description?: string;
  }>;
  measurements?: {
    horizontal_fov?: string;
    working_distance?: string;
    smallest_text?: string;
  };
  attributes?: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  camera_view?: {
    product_flow?: string;
    description?: string;
  };
  relay_outputs?: Array<{
    id: string;
    output_number: number;
    type?: string;
    custom_name?: string;
    notes?: string;
  }>;
}

interface IoTDevice {
  id: string;
  name: string;
  hardware_master_id?: string;
  receiver_name?: string;
}

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  cameras: Camera[];
  iot_devices: IoTDevice[];
}

interface Position {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  titles: Array<{ id: string; title: string }>;
  equipment: Equipment[];
}

interface LineData {
  id: string;
  line_name: string;
  min_speed?: number;
  max_speed?: number;
  positions: Position[];
}

interface LineVisualizationViewProps {
  lineId: string;
  lineData: LineData | undefined;
  loading: boolean;
  editingCamera: any;
  editingIoT: any;
  cameraDialogOpen: boolean;
  cameraFormData: any;
  masterData: any;
  isSavingCamera: boolean;
  isSavingIoT: boolean;
  cameraRetryCount: number;
  iotRetryCount: number;
  onBack: () => void;
  setEditingCamera: (camera: any) => void;
  setEditingIoT: (iot: any) => void;
  setCameraDialogOpen: (open: boolean) => void;
  handleEditCamera: (camera: any, positionName: string, equipmentName: string) => void;
  handleCameraSave: (formData: any) => void;
  handleUpdateIoT: () => void;
}

export const LineVisualizationView: React.FC<LineVisualizationViewProps> = ({
  lineId,
  lineData,
  loading,
  editingCamera,
  editingIoT,
  cameraDialogOpen,
  cameraFormData,
  masterData,
  isSavingCamera,
  isSavingIoT,
  cameraRetryCount,
  iotRetryCount,
  onBack,
  setEditingCamera,
  setEditingIoT,
  setCameraDialogOpen,
  handleEditCamera,
  handleCameraSave,
  handleUpdateIoT,
}) => {
  const { cameras, lenses, lights, plcs, hmis, visionUseCases } = masterData;

  const getTitleColor = (title: string) => {
    switch (title) {
      case 'RLE': return 'bg-red-100 text-red-800 border-red-200';
      case 'OP': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (!lineData) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Line data not found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lines
              </Button>
              <div>
                <CardTitle>{lineData.line_name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Speed Range: {lineData.min_speed || 0} - {lineData.max_speed || 0} units/min
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-8">
            {/* Process Flow Diagram */}
            <div className="bg-muted/30 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Process Flow
              </h3>
              
              <div className="flex items-center gap-4 overflow-x-auto pb-4">
                {lineData.positions.map((position, index) => (
                  <React.Fragment key={position.id}>
                    {/* Position Block */}
                    <div className="flex-shrink-0 bg-white border-2 border-primary rounded-lg p-4 min-w-[280px]">
                      <div className="space-y-3">
                        {/* Position Header */}
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-lg">{position.name}</h4>
                          <div className="flex gap-1">
                            {position.titles.map((title) => (
                              <Badge
                                key={title.id}
                                className={getTitleColor(title.title)}
                                variant="outline"
                              >
                                {title.title}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Equipment List */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">
                            Equipment ({position.equipment.length})
                          </p>
                          {position.equipment.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No equipment</p>
                          ) : (
                            position.equipment.map((equipment) => (
                              <div key={equipment.id} className="bg-muted/50 p-2 rounded border">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex-1 min-w-0">
                                    <span className="font-medium text-sm block truncate">{equipment.name}</span>
                                    <Badge variant="secondary" className="text-xs mt-1">
                                      {equipment.equipment_type}
                                    </Badge>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 flex-shrink-0"
                                    onClick={() => {
                                      // Find camera or IoT device to edit
                                      const camera = equipment.cameras[0];
                                      const iot = equipment.iot_devices[0];
                                      
                                      if (camera) {
                                        setEditingCamera({
                                          ...camera,
                                          positionName: position.name,
                                          equipmentName: equipment.name
                                        });
                                      } else if (iot) {
                                        setEditingIoT({
                                          ...iot,
                                          positionName: position.name,
                                          equipmentName: equipment.name
                                        });
                                      }
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                </div>
                                
                                {/* Devices */}
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {equipment.cameras.length > 0 && (
                                    <div className="flex items-center gap-1 text-green-600" title="Camera">
                                      <Camera className="h-3 w-3" />
                                      <span>{equipment.cameras.length}</span>
                                    </div>
                                  )}
                                  {/* Light indicator - check if any camera has light_required or light_id */}
                                  {equipment.cameras.some((cam: Camera) => cam.light_required || cam.light_id) && (
                                    <div className="flex items-center gap-1 text-yellow-600" title="Light">
                                      <Lightbulb className="h-3 w-3" />
                                    </div>
                                  )}
                                  {/* PLC indicator */}
                                  {equipment.cameras.some((cam: Camera) => cam.plc_master_id) && (
                                    <div className="flex items-center gap-1 text-purple-600" title="PLC">
                                      <Cpu className="h-3 w-3" />
                                    </div>
                                  )}
                                  {/* HMI indicator */}
                                  {equipment.cameras.some((cam: Camera) => cam.hmi_master_id) && (
                                    <div className="flex items-center gap-1 text-orange-600" title="HMI">
                                      <Monitor className="h-3 w-3" />
                                    </div>
                                  )}
                                  {equipment.iot_devices.length > 0 && (
                                    <div className="flex items-center gap-1 text-blue-600" title="IoT Device">
                                      <Zap className="h-3 w-3" />
                                      <span>{equipment.iot_devices.length}</span>
                                    </div>
                                  )}
                                </div>
                               
                               {/* Camera Attributes */}
                               {equipment.cameras.some((cam: Camera) => cam.attributes && cam.attributes.length > 0) && (
                                 <div className="mt-2 pt-2 border-t border-border/50">
                                   <p className="text-xs font-medium text-muted-foreground mb-1">Attributes:</p>
                                   <div className="flex flex-wrap gap-1">
                                     {equipment.cameras.flatMap((cam: Camera) => 
                                       (cam.attributes || []).map((attr) => (
                                         <span 
                                           key={attr.id} 
                                           className="text-xs bg-muted px-1.5 py-0.5 rounded"
                                           title={attr.description || attr.title}
                                         >
                                           {attr.title}
                                         </span>
                                       ))
                                     )}
                                   </div>
                                 </div>
                               )}
                               
                               {/* PLC Outputs */}
                               {equipment.cameras.some((cam: Camera) => cam.relay_outputs && cam.relay_outputs.length > 0) && (
                                 <div className="mt-2 pt-2 border-t border-border/50">
                                   <p className="text-xs font-medium text-muted-foreground mb-1">PLC Outputs:</p>
                                   <div className="flex flex-wrap gap-1">
                                     {equipment.cameras.flatMap((cam: Camera) => 
                                       (cam.relay_outputs || []).map((output) => (
                                         <span 
                                           key={output.id} 
                                           className="text-xs bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded"
                                           title={output.notes || `Output ${output.output_number}: ${output.type || 'N/A'}`}
                                         >
                                           {output.custom_name || `Output ${output.output_number}`}
                                         </span>
                                       ))
                                     )}
                                   </div>
                                 </div>
                               )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Arrow between positions */}
                    {index < lineData.positions.length - 1 && (
                      <div className="flex-shrink-0 flex items-center">
                        <div className="w-8 h-0.5 bg-primary"></div>
                        <div className="w-0 h-0 border-l-4 border-l-primary border-t-2 border-b-2 border-t-transparent border-b-transparent"></div>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Detailed Device Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cameras */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Camera className="mr-2 h-5 w-5" />
                    Cameras
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Array.from(new Map(
                      lineData.positions.flatMap(pos => 
                        pos.equipment.flatMap(eq => 
                          eq.cameras.map(camera => ({
                            ...camera,
                            positionName: pos.name,
                            equipmentName: eq.name
                          }))
                        )
                      ).map(camera => [camera.id, camera])
                    ).values()).map((camera: Camera & { positionName: string; equipmentName: string }) => (
                      <div key={camera.id} className="bg-muted/50 p-3 rounded border">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium">{camera.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {camera.equipmentName} • Position: {camera.positionName}
                            </p>
                            {(() => {
                              const cameraModel = masterData.cameras.find((c: any) => c.id === camera.camera_type);
                              return cameraModel && (
                                <Badge variant="outline" className="mt-2">
                                  {cameraModel.manufacturer} - {cameraModel.model_number}
                                  {cameraModel.camera_type && ` (${cameraModel.camera_type})`}
                                </Badge>
                              );
                            })()}
                            {(camera.light_id || camera.plc_master_id || camera.hmi_master_id) && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {camera.light_id && <Badge variant="secondary" className="text-xs">Light attached</Badge>}
                                {camera.plc_master_id && <Badge variant="secondary" className="text-xs">PLC attached</Badge>}
                                {camera.hmi_master_id && <Badge variant="secondary" className="text-xs">HMI attached</Badge>}
                              </div>
                            )}
                            {camera.use_cases && camera.use_cases.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs text-muted-foreground mb-1">Use Cases:</p>
                                <div className="flex flex-wrap gap-1">
                                  {camera.use_cases.map((uc: any) => {
                                    const visionUseCase = masterData.visionUseCases.find((v: any) => v.id === uc.vision_use_case_id);
                                    return visionUseCase ? (
                                      <Badge key={uc.id} variant="outline" className="text-xs">
                                        {visionUseCase.name}
                                      </Badge>
                                    ) : null;
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCamera(camera, camera.positionName, camera.equipmentName)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                    {lineData.positions.every(pos => pos.equipment.every(eq => eq.cameras.length === 0)) && (
                      <p className="text-muted-foreground text-center py-4">No cameras configured</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* IoT Devices */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Cpu className="mr-2 h-5 w-5" />
                    IoT Devices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {lineData.positions.flatMap(pos => 
                      pos.equipment.flatMap(eq => 
                        eq.iot_devices.map(device => ({
                          ...device,
                          positionName: pos.name,
                          equipmentName: eq.name
                        }))
                      )
                    ).map((device) => (
                      <div key={device.id} className="bg-muted/50 p-3 rounded border">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium">{device.equipmentName}</p>
                            <p className="text-sm text-muted-foreground mb-2">Position: {device.positionName}</p>
                            <div className="space-y-1 text-sm">
                              <p><span className="font-medium">Device:</span> {device.name}</p>
                              <p><span className="font-medium">Attached Receiver:</span> {device.receiver_name || "Not assigned"}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingIoT(device)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                    {lineData.positions.every(pos => pos.equipment.every(eq => eq.iot_devices.length === 0)) && (
                      <p className="text-muted-foreground text-center py-4">No IoT devices configured</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Use Cases Table */}
      <LineUseCasesTable lineId={lineId} />

      {/* Edit Camera Dialog */}
      <CameraConfigDialog
        open={cameraDialogOpen}
        onOpenChange={setCameraDialogOpen}
        mode="edit"
        cameraData={cameraFormData}
        masterData={{
          cameras,
          lenses,
          lights,
          plcs,
          hmis,
          visionUseCases,
        }}
        onSave={handleCameraSave}
        isLoading={isSavingCamera}
        retryCount={cameraRetryCount}
      />

      {/* Edit IoT Device Dialog */}
      <Dialog open={!!editingIoT} onOpenChange={() => setEditingIoT(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit IoT Device</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Device Name</Label>
              <Input
                value={editingIoT?.name || ""}
                onChange={(e) => setEditingIoT((prev: any) => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Enter device name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIoT(null)} disabled={isSavingIoT}>
              Cancel
            </Button>
            <Button onClick={handleUpdateIoT} disabled={isSavingIoT}>
              {isSavingIoT ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {iotRetryCount > 0 ? `Retrying (${iotRetryCount}/3)...` : "Saving..."}
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
