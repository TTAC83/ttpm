import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Cpu, MapPin, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CameraConfigDialog } from "@/components/shared/CameraConfigDialog";
import { hardwareCatalog } from "@/lib/hardwareCatalogService"; // Use unified hardware catalog
import { LineUseCasesTable } from "./LineUseCasesTable";

interface LineData {
  id: string;
  line_name: string;
  min_speed?: number;
  max_speed?: number;
  positions: Position[];
}

interface Position {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  titles: PositionTitle[];
  equipment: Equipment[];
}

interface PositionTitle {
  id: string;
  title: "RLE" | "OP";
}

interface Equipment {
  id: string;
  name: string;
  equipment_type: string;
  cameras: Camera[];
  iot_devices: IoTDevice[];
}

interface Camera {
  id: string;
  camera_type: string;
  lens_type: string;
  light_required?: boolean;
  light_id?: string;
  plc_master_id?: string;
  hmi_master_id?: string;
  measurements?: {
    horizontal_fov?: string;
    working_distance?: string;
    smallest_text?: string;
  };
  use_cases?: Array<{
    id: string;
    vision_use_case_id: string;
    use_case_name: string;
    description?: string;
  }>;
  attributes?: Array<{
    id: string;
    title: string;
    description?: string;
  }>;
  camera_view?: {
    product_flow?: string;
    description?: string;
  };
}

interface IoTDevice {
  id: string;
  name: string;
  hardware_master_id?: string;
  receiver_name?: string;
}

interface LineVisualizationProps {
  lineId: string;
  onBack: () => void;
}

export const LineVisualization: React.FC<LineVisualizationProps> = ({
  lineId,
  onBack,
}) => {
  const [lineData, setLineData] = useState<LineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCamera, setEditingCamera] = useState<(Camera & { positionName: string; equipmentName: string }) | null>(null);
  const [editingIoT, setEditingIoT] = useState<IoTDevice & { positionName: string; equipmentName: string } | null>(null);
  const [cameraDialogOpen, setCameraDialogOpen] = useState(false);
  const [cameraFormData, setCameraFormData] = useState<any>(null);
  
  // Master data for camera configuration
  const [cameras, setCameras] = useState<Array<{ id: string; manufacturer: string; model_number: string; camera_type?: string }>>([]);
  const [lights, setLights] = useState<Array<{ id: string; manufacturer: string; model_number: string; description?: string }>>([]);
  const [plcs, setPlcs] = useState<Array<{ id: string; manufacturer: string; model_number: string; plc_type?: string }>>([]);
  const [hmis, setHmis] = useState<Array<{ id: string; sku_no: string; product_name: string }>>([]);
  const [visionUseCases, setVisionUseCases] = useState<Array<{ id: string; name: string; description?: string; category?: string }>>([]);
  const [receivers, setReceivers] = useState<Array<{ id: string; name: string }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchLineData();
    fetchMasterData();
    fetchReceivers();
  }, [lineId]);

  const fetchLineData = async () => {
    try {
      // First, try to determine if this is a solutions line or implementation line
      const { data: solutionsLine } = await supabase
        .from('solutions_lines')
        .select('id')
        .eq('id', lineId)
        .maybeSingle();

      const isSolutionsLine = !!solutionsLine;
      const tableName = isSolutionsLine ? 'solutions_lines' : 'lines';

      // Fetch line basic info
      const { data: line, error: lineError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', lineId)
        .single();

      if (lineError) throw lineError;

      // Fetch positions - positions always use line_id regardless of implementation/solutions
      const { data: allPositions, error: allPositionsError } = await supabase
        .from('positions')
        .select('*')
        .eq('line_id', lineId)
        .order('position_x');
      
      if (allPositionsError) throw allPositionsError;

      // Fetch position titles separately for each position
      const positionsWithTitles = await Promise.all(
        (allPositions || []).map(async (position) => {
          const { data: titles } = await supabase
            .from('position_titles')
            .select('id, title')
            .eq('position_id', position.id);
          
          return {
            ...position,
            position_titles: titles || []
          };
        })
      );

      // Prepare vision accessory master IDs to filter IoT list
      const { data: visionMaster } = await supabase
        .from('hardware_master')
        .select('id, hardware_type')
        .in('hardware_type', ['Light','PLC','HMI']);
      const visionAccessoryIds = new Set((visionMaster || []).map((h: any) => h.id));

      // Fetch equipment for each position
      const positionsWithEquipment = await Promise.all(
        positionsWithTitles.map(async (position) => {
          // For solutions lines, equipment is linked via solutions_line_id
          // For implementation lines, equipment is linked via position_id
          const equipmentQuery = supabase
            .from('equipment')
            .select(`
              *,
              cameras(*),
              iot_devices(*)
            `);
          
          if (isSolutionsLine) {
            equipmentQuery.eq('solutions_line_id', lineId).eq('position_id', position.id);
          } else {
            equipmentQuery.eq('position_id', position.id);
          }
          
          const { data: equipment, error: equipmentError } = await equipmentQuery;

          if (equipmentError) throw equipmentError;

          // Fetch additional camera data for each camera in each equipment
          const equipmentWithCameraData = await Promise.all(
            (equipment || []).map(async (eq) => {
              const camerasWithData = await Promise.all(
                (eq.cameras || []).map(async (camera: any) => {
                  // Fetch measurements
                  const { data: measurements } = await supabase
                    .from('camera_measurements')
                    .select('*')
                    .eq('camera_id', camera.id)
                    .maybeSingle();

                  // Fetch use cases
                  const { data: useCases } = await supabase
                    .from('camera_use_cases')
                    .select(`
                      id,
                      vision_use_case_id,
                      description,
                      vision_use_cases_master (
                        name
                      )
                    `)
                    .eq('camera_id', camera.id);

                  // Fetch attributes
                  const { data: attributes } = await supabase
                    .from('camera_attributes')
                    .select('*')
                    .eq('camera_id', camera.id)
                    .order('order_index');

                  // Fetch camera view
                  const { data: cameraView } = await supabase
                    .from('camera_views')
                    .select('*')
                    .eq('camera_id', camera.id)
                    .maybeSingle();

                  return {
                    ...camera,
                    measurements: measurements ? {
                      horizontal_fov: measurements.horizontal_fov,
                      working_distance: measurements.working_distance,
                      smallest_text: measurements.smallest_text
                    } : undefined,
                    use_cases: useCases?.map((uc: any) => ({
                      id: uc.id,
                      vision_use_case_id: uc.vision_use_case_id,
                      use_case_name: uc.vision_use_cases_master?.name || '',
                      description: uc.description
                    })) || [],
                    attributes: attributes || [],
                    camera_view: cameraView || undefined
                  };
                })
              );

              return {
                ...eq,
                cameras: camerasWithData,
                iot_devices: (eq.iot_devices || []).filter((d: any) => !visionAccessoryIds.has(d.hardware_master_id))
              };
            })
          );

          return {
            ...position,
            titles: (position.position_titles || []).map((title: any) => ({
              id: title.id,
              title: title.title as "RLE" | "OP"
            })),
            equipment: equipmentWithCameraData
          };
        })
      );

      setLineData({
        ...line,
        positions: positionsWithEquipment
      });

    } catch (error) {
      console.error('Error fetching line data:', error);
      toast({
        title: "Error",
        description: "Failed to load line data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    // IMPORTANT: Always use unified hardware_master via hardwareCatalog service
    const [camerasList, lightsList, plcsList, hmisData, useCasesData] = await Promise.all([
      hardwareCatalog.getCameras(),
      hardwareCatalog.getLights(),
      hardwareCatalog.getPlcs(),
      supabase
        .from('hardware_master')
        .select('id, sku_no, product_name')
        .eq('hardware_type', 'HMI')
        .order('product_name'),
      supabase
        .from('vision_use_cases_master')
        .select('id, name, description, category')
        .order('category', { ascending: true })
        .order('name', { ascending: true }),
    ]);

    setCameras(camerasList);
    setLights(lightsList);
    setPlcs(plcsList);
    if (hmisData.data) {
      setHmis(hmisData.data);
    }
    if (useCasesData.data) {
      setVisionUseCases(useCasesData.data as any);
    }
  };

  const fetchReceivers = async () => {
    if (!lineData) return;
    
    // Try to get solutions_project_id from the line
    const { data: solutionsLine } = await supabase
      .from('solutions_lines')
      .select('solutions_project_id')
      .eq('id', lineId)
      .maybeSingle();

    if (solutionsLine?.solutions_project_id) {
      const { data } = await supabase
        .from('project_iot_requirements')
        .select('id, name')
        .eq('solutions_project_id', solutionsLine.solutions_project_id)
        .eq('hardware_type', 'receiver');
      setReceivers(data || []);
    }
  };

  const handleEditCamera = (camera: any, positionName: string, equipmentName: string) => {
    setCameraFormData({
      name: camera.id,
      camera_master_id: camera.camera_type || "",
      light_required: camera.light_required || false,
      light_id: camera.light_id || "",
      light_notes: camera.light_notes || "",
      plc_attached: !!camera.plc_master_id,
      plc_master_id: camera.plc_master_id || "",
      relay_outputs: [],
      hmi_required: !!camera.hmi_master_id,
      hmi_master_id: camera.hmi_master_id || "",
      hmi_notes: "",
      horizontal_fov: camera.measurements?.horizontal_fov || "",
      working_distance: camera.measurements?.working_distance || "",
      smallest_text: camera.measurements?.smallest_text || "",
      use_case_ids: camera.use_cases?.map((uc: any) => uc.vision_use_case_id) || [],
      use_case_description: "",
      attributes: camera.attributes || [],
      product_flow: camera.camera_view?.product_flow || "",
      camera_view_description: camera.camera_view?.description || "",
    });
    setEditingCamera({ ...camera, positionName, equipmentName });
    setCameraDialogOpen(true);
  };

  const handleCameraSave = async (formData: any) => {
    if (!editingCamera) return;

    try {
      // Convert empty strings to null for UUID fields
      const cleanFormData = {
        ...formData,
        light_id: formData.light_id || null,
        plc_master_id: formData.plc_master_id || null,
        hmi_master_id: formData.hmi_master_id || null,
      };

      // Update main camera record
      const { error: cameraError } = await supabase
        .from('cameras')
        .update({
          camera_type: cleanFormData.camera_master_id,
          light_required: cleanFormData.light_required,
          light_id: cleanFormData.light_id,
          plc_attached: cleanFormData.plc_attached,
          plc_master_id: cleanFormData.plc_master_id,
          hmi_required: cleanFormData.hmi_required,
          hmi_master_id: cleanFormData.hmi_master_id,
        })
        .eq('id', editingCamera.id);

      if (cameraError) throw cameraError;

      // Update or insert camera measurements
      const { error: measurementsError } = await supabase
        .from('camera_measurements')
        .upsert({
          camera_id: editingCamera.id,
          horizontal_fov: parseFloat(cleanFormData.horizontal_fov) || null,
          working_distance: parseFloat(cleanFormData.working_distance) || null,
          smallest_text: cleanFormData.smallest_text || null,
        }, { onConflict: 'camera_id' });

      if (measurementsError) throw measurementsError;

      // Update camera view
      const { error: viewError } = await supabase
        .from('camera_views')
        .upsert({
          camera_id: editingCamera.id,
          product_flow: cleanFormData.product_flow || null,
          description: cleanFormData.camera_view_description || null,
        }, { onConflict: 'camera_id' });

      if (viewError) throw viewError;

      // Delete existing use cases and insert new ones
      await supabase
        .from('camera_use_cases')
        .delete()
        .eq('camera_id', editingCamera.id);

      if (cleanFormData.use_case_ids && cleanFormData.use_case_ids.length > 0) {
        const useCases = cleanFormData.use_case_ids.map((useCaseId: string) => ({
          camera_id: editingCamera.id,
          vision_use_case_id: useCaseId,
          description: cleanFormData.use_case_description || null,
        }));

        const { error: useCasesError } = await supabase
          .from('camera_use_cases')
          .insert(useCases);

        if (useCasesError) throw useCasesError;
      }

      // Delete existing attributes and insert new ones
      await supabase
        .from('camera_attributes')
        .delete()
        .eq('camera_id', editingCamera.id);

      if (cleanFormData.attributes && cleanFormData.attributes.length > 0) {
        const attributes = cleanFormData.attributes.map((attr: any, index: number) => ({
          camera_id: editingCamera.id,
          title: attr.title,
          description: attr.description,
          order_index: index,
        }));

        const { error: attributesError } = await supabase
          .from('camera_attributes')
          .insert(attributes);

        if (attributesError) throw attributesError;
      }

      toast({
        title: "Success",
        description: "Camera updated successfully",
      });

      setCameraDialogOpen(false);
      setEditingCamera(null);
      fetchLineData();
    } catch (error) {
      console.error('Error updating camera:', error);
      toast({
        title: "Error",
        description: "Failed to update camera",
        variant: "destructive",
      });
    }
  };

  const handleUpdateIoT = async () => {
    if (!editingIoT) return;

    try {
      const { error } = await supabase
        .from('iot_devices')
        .update({
          name: editingIoT.name,
          hardware_master_id: editingIoT.hardware_master_id,
        })
        .eq('id', editingIoT.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "IoT device updated successfully",
      });

      setEditingIoT(null);
      fetchLineData();
    } catch (error) {
      console.error('Error updating IoT device:', error);
      toast({
        title: "Error",
        description: "Failed to update IoT device",
        variant: "destructive",
      });
    }
  };

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
                                <div className="flex gap-2 text-xs">
                                  {equipment.cameras.length > 0 && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <Camera className="h-3 w-3" />
                                      <span>{equipment.cameras.length}</span>
                                    </div>
                                  )}
                                  {equipment.iot_devices.length > 0 && (
                                    <div className="flex items-center gap-1 text-blue-600">
                                      <Cpu className="h-3 w-3" />
                                      <span>{equipment.iot_devices.length}</span>
                                    </div>
                                  )}
                                </div>
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
                    ).values()).map((camera) => (
                      <div key={camera.id} className="bg-muted/50 p-3 rounded border">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium">{camera.equipmentName}</p>
                            <p className="text-sm text-muted-foreground">Position: {camera.positionName}</p>
                            <Badge variant="outline" className="mt-2">{camera.camera_type}</Badge>
                            {(camera.light_id || camera.plc_master_id || camera.hmi_master_id) && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {camera.light_id && <Badge variant="secondary" className="text-xs">Light attached</Badge>}
                                {camera.plc_master_id && <Badge variant="secondary" className="text-xs">PLC attached</Badge>}
                                {camera.hmi_master_id && <Badge variant="secondary" className="text-xs">HMI attached</Badge>}
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
          lights,
          plcs,
          hmis,
          visionUseCases,
        }}
        onSave={handleCameraSave}
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
                onChange={(e) => setEditingIoT(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="Enter device name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingIoT(null)}>Cancel</Button>
            <Button onClick={handleUpdateIoT}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};