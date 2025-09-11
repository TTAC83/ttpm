import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface ProcessFlowBuilderProps {
  positions: Position[];
  setPositions: (positions: Position[]) => void;
}

export const ProcessFlowBuilder: React.FC<ProcessFlowBuilderProps> = ({
  positions,
  setPositions,
}) => {
  const [newPositionName, setNewPositionName] = useState("");
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);
  const [isPositionDialogOpen, setIsPositionDialogOpen] = useState(false);
  const [isEquipmentDialogOpen, setIsEquipmentDialogOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const addPosition = () => {
    if (newPositionName.trim()) {
      const newPosition: Position = {
        id: `position-${Date.now()}`,
        name: newPositionName.trim(),
        position_x: 100 + positions.length * 120,
        position_y: 100,
        titles: [],
        equipment: [],
      };
      setPositions([...positions, newPosition]);
      setNewPositionName("");
      setIsPositionDialogOpen(false);
    }
  };

  const addEquipment = () => {
    if (newEquipmentName.trim() && selectedPositionId) {
      const newEquipment: Equipment = {
        id: `equipment-${Date.now()}`,
        name: newEquipmentName.trim(),
        equipment_type: "",
        cameras: [],
        iot_devices: [],
      };
      
      setPositions(
        positions.map((position) =>
          position.id === selectedPositionId
            ? { ...position, equipment: [...position.equipment, newEquipment] }
            : position
        )
      );
      setNewEquipmentName("");
      setSelectedPositionId(null);
      setIsEquipmentDialogOpen(false);
    }
  };

  const removePosition = (id: string) => {
    setPositions(positions.filter((position) => position.id !== id));
  };

  const removeEquipment = (positionId: string, equipmentId: string) => {
    setPositions(
      positions.map((position) =>
        position.id === positionId
          ? {
              ...position,
              equipment: position.equipment.filter((eq) => eq.id !== equipmentId),
            }
          : position
      )
    );
  };

  const updatePositionPosition = (id: string, x: number, y: number) => {
    setPositions(
      positions.map((position) =>
        position.id === id ? { ...position, position_x: x, position_y: y } : position
      )
    );
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedItem) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      updatePositionPosition(draggedItem, x, y);
      setDraggedItem(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Process Flow Map</CardTitle>
            <CardDescription>
              Create positions, then add equipment to each position
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isPositionDialogOpen} onOpenChange={setIsPositionDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Position
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Position</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="position-name">Position Name</Label>
                    <Input
                      id="position-name"
                      value={newPositionName}
                      onChange={(e) => setNewPositionName(e.target.value)}
                      placeholder="Enter position name"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsPositionDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addPosition}>Add Position</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isEquipmentDialogOpen} onOpenChange={setIsEquipmentDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={positions.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Equipment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Equipment to Position</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="position-select">Select Position</Label>
                    <select
                      id="position-select"
                      className="w-full p-2 border rounded"
                      value={selectedPositionId || ""}
                      onChange={(e) => setSelectedPositionId(e.target.value)}
                    >
                      <option value="">Select a position</option>
                      {positions.map((position) => (
                        <option key={position.id} value={position.id}>
                          {position.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="equipment-name">Equipment Name</Label>
                    <Input
                      id="equipment-name"
                      value={newEquipmentName}
                      onChange={(e) => setNewEquipmentName(e.target.value)}
                      placeholder="Enter equipment name"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsEquipmentDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addEquipment}>Add Equipment</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div
          className="relative min-h-[400px] bg-muted/50 rounded-lg border-2 border-dashed border-border p-4"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {positions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                  No Positions Added
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by adding positions, then add equipment to each position
                </p>
                <Dialog open={isPositionDialogOpen} onOpenChange={setIsPositionDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add First Position
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Position</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="position-name-empty">Position Name</Label>
                        <Input
                          id="position-name-empty"
                          value={newPositionName}
                          onChange={(e) => setNewPositionName(e.target.value)}
                          placeholder="Enter position name"
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setIsPositionDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addPosition}>Add Position</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ) : (
            positions.map((position) => (
              <div
                key={position.id}
                draggable
                onDragStart={(e) => handleDragStart(e, position.id)}
                className="absolute bg-secondary border-2 border-primary rounded-lg p-4 cursor-move shadow-md hover:shadow-lg transition-shadow group min-w-[200px]"
                style={{
                  left: position.position_x,
                  top: position.position_y,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-foreground">{position.name}</h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePosition(position.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                
                {position.equipment.length === 0 ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-muted-foreground mb-2">No equipment</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPositionId(position.id);
                        setIsEquipmentDialogOpen(true);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Equipment
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {position.equipment.map((equipment) => (
                      <div
                        key={equipment.id}
                        className="flex items-center justify-between bg-background p-2 rounded border"
                      >
                        <span className="text-sm font-medium">{equipment.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeEquipment(position.id, equipment.id)}
                          className="h-5 w-5 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedPositionId(position.id);
                        setIsEquipmentDialogOpen(true);
                      }}
                      className="w-full mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Equipment
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};