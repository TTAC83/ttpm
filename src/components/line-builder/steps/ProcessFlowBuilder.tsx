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
        position_x: 20 + positions.length * 220, // 200px box width + 20px spacing
        position_y: 50,
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
        <div className="relative">
          {/* Scrollable container for positions */}
          <div
            className="relative min-h-[400px] bg-muted/50 rounded-lg border-2 border-dashed border-border p-4 overflow-x-auto"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{ 
              minWidth: positions.length > 0 ? `${Math.max(800, positions.length * 220 + 40)}px` : '100%'
            }}
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
            <>
              {/* Draw arrows between positions */}
              {positions.map((position, index) => {
                if (index === positions.length - 1) return null; // No arrow after last position
                
                const startX = position.position_x + 200; // End of current box (200px width)
                const startY = position.position_y + 60; // Middle of box (120px height / 2)
                const endX = positions[index + 1].position_x; // Start of next box
                const endY = positions[index + 1].position_y + 60; // Middle of next box
                
                return (
                  <svg
                    key={`arrow-${position.id}`}
                    className="absolute pointer-events-none"
                    style={{
                      left: startX,
                      top: startY - 10,
                      width: endX - startX,
                      height: 20,
                    }}
                  >
                    <defs>
                      <marker
                        id={`arrowhead-${index}`}
                        markerWidth="10"
                        markerHeight="7"
                        refX="9"
                        refY="3.5"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3.5, 0 7"
                          fill="hsl(var(--primary))"
                        />
                      </marker>
                    </defs>
                    <line
                      x1="0"
                      y1="10"
                      x2={endX - startX - 10}
                      y2="10"
                      stroke="hsl(var(--primary))"
                      strokeWidth="2"
                      markerEnd={`url(#arrowhead-${index})`}
                    />
                  </svg>
                );
              })}

              {/* Position boxes */}
              {positions.map((position, index) => (
                <div
                  key={position.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, position.id)}
                  className="absolute bg-secondary border-2 border-primary rounded-lg p-4 cursor-move shadow-md hover:shadow-lg transition-shadow group"
                  style={{
                    left: position.position_x,
                    top: position.position_y,
                    width: '200px',
                    minHeight: '120px',
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-foreground text-sm">
                      {index + 1}. {position.name}
                    </h4>
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
                        className="text-xs h-7"
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
                          <span className="text-xs font-medium truncate">{equipment.name}</span>
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
                        className="w-full mt-2 text-xs h-7"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add Equipment
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};