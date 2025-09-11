import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface Position {
  id: string;
  name: string;
  position_x: number;
  position_y: number;
  equipment: Equipment[];
}

interface Equipment {
  id: string;
  name: string;
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

interface EquipmentTitlesProps {
  positions: Position[];
  setPositions: (positions: Position[]) => void;
}

export const EquipmentTitles: React.FC<EquipmentTitlesProps> = ({
  positions,
  setPositions,
}) => {
  const addTitle = (positionId: string, equipmentId: string, title: "RLE" | "OP") => {
    setPositions(
      positions.map((position) =>
        position.id === positionId
          ? {
              ...position,
              equipment: position.equipment.map((eq) =>
                eq.id === equipmentId
                  ? {
                      ...eq,
                      titles: [
                        ...eq.titles,
                        { id: Math.random().toString(36).substring(7), title },
                      ],
                    }
                  : eq
              ),
            }
          : position
      )
    );
  };

  const removeTitle = (positionId: string, equipmentId: string, titleId: string) => {
    setPositions(
      positions.map((position) =>
        position.id === positionId
          ? {
              ...position,
              equipment: position.equipment.map((eq) =>
                eq.id === equipmentId
                  ? {
                      ...eq,
                      titles: eq.titles.filter((title) => title.id !== titleId),
                    }
                  : eq
              ),
            }
          : position
      )
    );
  };

  const canAddTitle = (eq: Equipment, titleType: "RLE" | "OP") => {
    return !eq.titles.some((title) => title.title === titleType);
  };

  const allEquipment = positions.flatMap((position) =>
    position.equipment.map((eq) => ({ ...eq, positionId: position.id, positionName: position.name }))
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Equipment Titles</CardTitle>
          <CardDescription>
            Add RLE (Reject Line Exit) and OP (Operation Point) titles to your equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allEquipment.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No equipment available. Please add equipment in the previous step.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {allEquipment.map((eq) => (
                <Card key={`${eq.positionId}-${eq.id}`} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{eq.name}</h3>
                        <p className="text-sm text-muted-foreground">Position: {eq.positionName}</p>
                        <div className="flex flex-wrap gap-2">
                          {eq.titles.map((title) => (
                            <Badge
                              key={title.id}
                              variant="secondary"
                              className="flex items-center gap-1"
                            >
                              {title.title}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => removeTitle(eq.positionId, eq.id, title.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                          {eq.titles.length === 0 && (
                            <span className="text-sm text-muted-foreground">
                              No titles assigned
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {canAddTitle(eq, "RLE") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTitle(eq.positionId, eq.id, "RLE")}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add RLE
                          </Button>
                        )}
                        {canAddTitle(eq, "OP") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTitle(eq.positionId, eq.id, "OP")}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add OP
                          </Button>
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
    </div>
  );
};