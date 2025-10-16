import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Cpu, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

interface IoTDevice {
  id: string;
  name: string;
  hardware_master_id?: string;
  mac_address: string;
  receiver_mac_address: string;
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
  const { toast } = useToast();

  useEffect(() => {
    fetchLineData();
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

      // Fetch positions with their titles
      const { data: positions, error: positionsError } = await supabase
        .from('positions')
        .select(`
          *,
          position_titles(id, title)
        `)
        .eq('line_id', lineId)
        .order('position_x');

      if (positionsError) throw positionsError;

      // Fetch equipment for each position
      const positionsWithEquipment = await Promise.all(
        positions.map(async (position) => {
          const { data: equipment, error: equipmentError } = await supabase
            .from('equipment')
            .select(`
              *,
              cameras(*),
              iot_devices(*)
            `)
            .eq('position_id', position.id);

          if (equipmentError) throw equipmentError;

          return {
            ...position,
            titles: (position.position_titles || []).map((title: any) => ({
              id: title.id,
              title: title.title as "RLE" | "OP"
            })),
            equipment: equipment || []
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
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">{equipment.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {equipment.equipment_type}
                                  </Badge>
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
                    {lineData.positions.flatMap(pos => 
                      pos.equipment.flatMap(eq => 
                        eq.cameras.map(camera => ({
                          ...camera,
                          positionName: pos.name,
                          equipmentName: eq.name
                        }))
                      )
                    ).map((camera) => (
                      <div key={camera.id} className="bg-muted/50 p-3 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{camera.equipmentName}</p>
                            <p className="text-sm text-muted-foreground">Position: {camera.positionName}</p>
                          </div>
                          <Badge variant="outline">{camera.camera_type}</Badge>
                        </div>
                          <div className="space-y-1 text-sm">
                            <p><span className="font-medium">Lens:</span> {camera.lens_type}</p>
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
                      <div key={device.id} className="bg-muted/50 p-3 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">{device.equipmentName}</p>
                            <p className="text-sm text-muted-foreground">Position: {device.positionName}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <p><span className="font-medium">Device MAC:</span> {device.mac_address}</p>
                          <p><span className="font-medium">Receiver MAC:</span> {device.receiver_mac_address}</p>
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
    </div>
  );
};