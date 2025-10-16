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
  }>;
  iot_devices: Array<{
    id: string;
    name: string;
    hardware_master_id: string;
  }>;
}

interface EquipmentTitlesProps {
  positions: Position[];
  setPositions: React.Dispatch<React.SetStateAction<Position[]>>;
}

export const EquipmentTitles: React.FC<EquipmentTitlesProps> = ({
  positions,
  setPositions,
}) => {
  const addTitle = (positionId: string, title: "RLE" | "OP") => {
    setPositions(
      positions.map((position) =>
        position.id === positionId
          ? {
              ...position,
              titles: [
                ...position.titles,
                { id: Math.random().toString(36).substring(7), title },
              ],
            }
          : position
      )
    );
  };

  const removeTitle = (positionId: string, titleId: string) => {
    setPositions(
      positions.map((position) =>
        position.id === positionId
          ? {
              ...position,
              titles: position.titles.filter((title) => title.id !== titleId),
            }
          : position
      )
    );
  };

  const canAddTitle = (position: Position, titleType: "RLE" | "OP") => {
    return !position.titles.some((title) => title.title === titleType);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Position Titles</CardTitle>
          <CardDescription>
            Add RLE (Reject Line Exit) and OP (Operation Point) titles to your positions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {positions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No positions available. Please add positions in the previous step.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map((position) => (
                <Card key={position.id} className="border-l-4 border-l-primary">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h3 className="font-semibold">{position.name}</h3>
                        <div className="text-sm text-muted-foreground">
                          Equipment: {position.equipment.length > 0 
                            ? position.equipment.map(eq => eq.name).join(", ")
                            : "No equipment assigned"
                          }
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {position.titles.map((title) => (
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
                                onClick={() => removeTitle(position.id, title.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </Badge>
                          ))}
                          {position.titles.length === 0 && (
                            <span className="text-sm text-muted-foreground">
                              No titles assigned
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {canAddTitle(position, "RLE") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTitle(position.id, "RLE")}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            Add RLE
                          </Button>
                        )}
                        {canAddTitle(position, "OP") && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addTitle(position.id, "OP")}
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