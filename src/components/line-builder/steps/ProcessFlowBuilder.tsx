import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Move } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

interface ProcessFlowBuilderProps {
  equipment: Equipment[];
  setEquipment: (equipment: Equipment[]) => void;
}

export const ProcessFlowBuilder: React.FC<ProcessFlowBuilderProps> = ({
  equipment,
  setEquipment,
}) => {
  const [newEquipmentName, setNewEquipmentName] = useState("");
  const [addEquipmentOpen, setAddEquipmentOpen] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);

  const addEquipment = () => {
    if (!newEquipmentName.trim()) return;

    const newEquipment: Equipment = {
      id: Math.random().toString(36).substring(7),
      name: newEquipmentName,
      position_x: equipment.length * 150 + 50,
      position_y: 100,
      equipment_type: "Machine",
      titles: [],
      cameras: [],
      iot_devices: [],
    };

    setEquipment([...equipment, newEquipment]);
    setNewEquipmentName("");
    setAddEquipmentOpen(false);
  };

  const removeEquipment = (id: string) => {
    setEquipment(equipment.filter((eq) => eq.id !== id));
  };

  const updateEquipmentPosition = (id: string, x: number, y: number) => {
    setEquipment(
      equipment.map((eq) =>
        eq.id === id ? { ...eq, position_x: x, position_y: y } : eq
      )
    );
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    updateEquipmentPosition(draggedItem, x, y);
    setDraggedItem(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Process Flow Map</CardTitle>
          <CardDescription>
            Create a visual map of your production line by adding equipment blocks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Equipment Layout</h3>
            <Dialog open={addEquipmentOpen} onOpenChange={setAddEquipmentOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Equipment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Equipment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="equipment-name">Equipment Name</Label>
                    <Input
                      id="equipment-name"
                      value={newEquipmentName}
                      onChange={(e) => setNewEquipmentName(e.target.value)}
                      placeholder="Enter equipment name"
                    />
                  </div>
                  <Button onClick={addEquipment} className="w-full">
                    Add Equipment
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg h-96 relative bg-muted/5 overflow-hidden"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {equipment.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <Move className="mx-auto h-12 w-12 mb-2" />
                  <p>Add equipment to start building your process flow</p>
                </div>
              </div>
            ) : (
              equipment.map((eq) => (
                <div
                  key={eq.id}
                  className="absolute cursor-move group"
                  style={{
                    left: `${eq.position_x}px`,
                    top: `${eq.position_y}px`,
                  }}
                  draggable
                  onDragStart={(e) => handleDragStart(e, eq.id)}
                >
                  <div className="bg-background border-2 border-primary rounded-lg p-3 min-w-32 shadow-lg">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">{eq.name}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => removeEquipment(eq.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {eq.equipment_type}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {equipment.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              <p>💡 Drag equipment blocks to arrange your process flow</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};