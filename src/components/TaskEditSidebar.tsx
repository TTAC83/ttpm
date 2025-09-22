import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Save, X } from "lucide-react";
import { MasterTask } from "@/lib/wbsService";
import { toast } from "sonner";

interface TaskEditSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: MasterTask | null;
  onSave: (taskId: number, updates: Partial<MasterTask>) => void;
  type: 'task' | 'subtask';
}

export function TaskEditSidebar({ 
  open, 
  onOpenChange, 
  task, 
  onSave, 
  type 
}: TaskEditSidebarProps) {
  const [editData, setEditData] = useState<Partial<MasterTask>>({});

  const technologyScopeOptions = [
    { value: "both", label: "Both IoT & Vision" },
    { value: "iot", label: "IoT Only" },
    { value: "vision", label: "Vision Only" }
  ];

  const assignedRoleOptions = [
    { value: "implementation_lead", label: "Implementation Lead" },
    { value: "ai_iot_engineer", label: "AI/IoT Engineer" },
    { value: "project_coordinator", label: "Project Coordinator" },
    { value: "technical_project_lead", label: "Technical Project Lead" },
    { value: "customer_project_lead", label: "Customer Project Lead" }
  ];

  useEffect(() => {
    if (task && open) {
      setEditData({
        title: task.title,
        details: task.details || "",
        planned_start_offset_days: task.planned_start_offset_days,
        planned_end_offset_days: task.planned_end_offset_days,
        position: task.position,
        technology_scope: task.technology_scope,
        assigned_role: task.assigned_role
      });
    }
  }, [task, open]);

  const handleSave = () => {
    if (!task || !editData.title) {
      toast.error(`${type === 'task' ? 'Task' : 'Sub-task'} title is required`);
      return;
    }

    onSave(task.id, editData);
    onOpenChange(false);
    toast.success(`${type === 'task' ? 'Task' : 'Sub-task'} updated successfully`);
  };

  const handleCancel = () => {
    onOpenChange(false);
    setEditData({});
  };

  if (!task) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Edit {type === 'task' ? 'Task' : 'Sub-task'}
          </SheetTitle>
          <SheetDescription>
            Update the {type === 'task' ? 'task' : 'sub-task'} details and configuration.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editData.title || ""}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                placeholder="Enter title"
              />
            </div>
            
            <div>
              <Label htmlFor="edit-details">Details</Label>
              <Textarea
                id="edit-details"
                value={editData.details || ""}
                onChange={(e) => setEditData({ ...editData, details: e.target.value })}
                placeholder="Enter details"
                rows={4}
              />
            </div>
          </div>

          <Separator />

          {/* Timing Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Timing Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start">Start Offset (days)</Label>
                <Input
                  id="edit-start"
                  type="number"
                  value={editData.planned_start_offset_days || 0}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    planned_start_offset_days: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-end">End Offset (days)</Label>
                <Input
                  id="edit-end"
                  type="number"
                  value={editData.planned_end_offset_days || 1}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    planned_end_offset_days: parseInt(e.target.value) || 1 
                  })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Assignment Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assignment Configuration</h3>
            
            <div>
              <Label htmlFor="edit-position">Position</Label>
              <Input
                id="edit-position"
                type="number"
                min="1"
                value={editData.position || 1}
                onChange={(e) => setEditData({ 
                  ...editData, 
                  position: parseInt(e.target.value) || 1 
                })}
              />
            </div>
            
            <div>
              <Label htmlFor="edit-scope">Technology Scope</Label>
              <Select 
                value={editData.technology_scope || "both"} 
                onValueChange={(value) => setEditData({ ...editData, technology_scope: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {technologyScopeOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="edit-role">Assigned Role</Label>
              <Select 
                value={editData.assigned_role || "implementation_lead"} 
                onValueChange={(value) => setEditData({ ...editData, assigned_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignedRoleOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}