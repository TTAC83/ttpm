import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit3, Save, X } from "lucide-react";
import { MasterTask } from "@/lib/wbsService";
import { toast } from "sonner";

interface SubTaskManagerProps {
  parentTask: MasterTask;
  onSubTaskCreate: (subTask: Omit<MasterTask, "id" | "parent_task_id" | "subtasks">) => void;
  onSubTaskUpdate: (taskId: number, updates: Partial<MasterTask>) => void;
  onSubTaskDelete: (taskId: number) => void;
}

export function SubTaskManager({ 
  parentTask, 
  onSubTaskCreate, 
  onSubTaskUpdate, 
  onSubTaskDelete 
}: SubTaskManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newSubTask, setNewSubTask] = useState({
    title: "",
    details: "",
    planned_start_offset_days: 0,
    planned_end_offset_days: 1,
    position: 0,
    technology_scope: "both",
    assigned_role: "implementation_lead"
  });

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

  const handleCreateSubTask = () => {
    if (!newSubTask.title) {
      toast.error("Sub-task title is required");
      return;
    }

    onSubTaskCreate({
      ...newSubTask,
      step_id: parentTask.step_id,
      position: (parentTask.subtasks?.length || 0) + 1
    });

    setNewSubTask({
      title: "",
      details: "",
      planned_start_offset_days: 0,
      planned_end_offset_days: 1,
      position: 0,
      technology_scope: "both",
      assigned_role: "implementation_lead"
    });
    setIsCreating(false);
    toast.success("Sub-task created successfully");
  };

  const handleUpdateSubTask = (subTask: MasterTask) => {
    onSubTaskUpdate(subTask.id, subTask);
    setEditingId(null);
    toast.success("Sub-task updated successfully");
  };

  const handleDeleteSubTask = (subTaskId: number) => {
    if (window.confirm("Are you sure you want to delete this sub-task?")) {
      onSubTaskDelete(subTaskId);
      toast.success("Sub-task deleted successfully");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Sub-tasks for: {parentTask.title}</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCreating(true)}
          disabled={isCreating}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Sub-task
        </Button>
      </div>

      {/* Create new sub-task form */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Create New Sub-task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subtask-title">Title</Label>
              <Input
                id="subtask-title"
                value={newSubTask.title}
                onChange={(e) => setNewSubTask({ ...newSubTask, title: e.target.value })}
                placeholder="Sub-task title"
              />
            </div>
            <div>
              <Label htmlFor="subtask-details">Details</Label>
              <Textarea
                id="subtask-details"
                value={newSubTask.details}
                onChange={(e) => setNewSubTask({ ...newSubTask, details: e.target.value })}
                placeholder="Sub-task details"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subtask-start">Start Offset (days)</Label>
                <Input
                  id="subtask-start"
                  type="number"
                  value={newSubTask.planned_start_offset_days}
                  onChange={(e) => setNewSubTask({ 
                    ...newSubTask, 
                    planned_start_offset_days: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
              <div>
                <Label htmlFor="subtask-end">End Offset (days)</Label>
                <Input
                  id="subtask-end"
                  type="number"
                  value={newSubTask.planned_end_offset_days}
                  onChange={(e) => setNewSubTask({ 
                    ...newSubTask, 
                    planned_end_offset_days: parseInt(e.target.value) || 1 
                  })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="subtask-scope">Technology Scope</Label>
                <Select 
                  value={newSubTask.technology_scope} 
                  onValueChange={(value) => setNewSubTask({ ...newSubTask, technology_scope: value })}
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
                <Label htmlFor="subtask-role">Assigned Role</Label>
                <Select 
                  value={newSubTask.assigned_role} 
                  onValueChange={(value) => setNewSubTask({ ...newSubTask, assigned_role: value })}
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
            <div className="flex gap-2">
              <Button onClick={handleCreateSubTask}>
                <Save className="h-4 w-4 mr-1" />
                Create Sub-task
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing sub-tasks */}
      {parentTask.subtasks && parentTask.subtasks.length > 0 && (
        <div className="space-y-2">
          {parentTask.subtasks.map((subTask) => (
            <SubTaskItem
              key={subTask.id}
              subTask={subTask}
              isEditing={editingId === subTask.id}
              onEdit={() => setEditingId(subTask.id)}
              onSave={handleUpdateSubTask}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDeleteSubTask(subTask.id)}
              technologyScopeOptions={technologyScopeOptions}
              assignedRoleOptions={assignedRoleOptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SubTaskItemProps {
  subTask: MasterTask;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (subTask: MasterTask) => void;
  onCancel: () => void;
  onDelete: () => void;
  technologyScopeOptions: { value: string; label: string }[];
  assignedRoleOptions: { value: string; label: string }[];
}

function SubTaskItem({ 
  subTask, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete,
  technologyScopeOptions,
  assignedRoleOptions
}: SubTaskItemProps) {
  const [editData, setEditData] = useState(subTask);

  if (isEditing) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4 space-y-4">
          <div>
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={editData.title}
              onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-details">Details</Label>
            <Textarea
              id="edit-details"
              value={editData.details || ""}
              onChange={(e) => setEditData({ ...editData, details: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-start">Start Offset (days)</Label>
              <Input
                id="edit-start"
                type="number"
                value={editData.planned_start_offset_days}
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
                value={editData.planned_end_offset_days}
                onChange={(e) => setEditData({ 
                  ...editData, 
                  planned_end_offset_days: parseInt(e.target.value) || 1 
                })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="edit-scope">Technology Scope</Label>
              <Select 
                value={editData.technology_scope} 
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
                value={editData.assigned_role} 
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
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave(editData)}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h5 className="font-medium text-sm">{subTask.title}</h5>
            {subTask.details && (
              <p className="text-xs text-muted-foreground mt-1">{subTask.details}</p>
            )}
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                Days: {subTask.planned_start_offset_days} - {subTask.planned_end_offset_days}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {technologyScopeOptions.find(opt => opt.value === subTask.technology_scope)?.label}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {assignedRoleOptions.find(opt => opt.value === subTask.assigned_role)?.label}
              </Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Edit3 className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
