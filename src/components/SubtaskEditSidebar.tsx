import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Save, X, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Subtask {
  id: string;
  task_id: string;
  title: string;
  details: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  assignee: string | null;
  planned_start_offset_days: number;
  planned_end_offset_days: number;
  position: number;
  technology_scope: string;
  assigned_role: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    name: string;
  } | null;
}

interface Profile {
  user_id: string;
  name: string;
}

interface SubtaskEditSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtask: Subtask | null;
  profiles: Profile[];
  onSave: (subtask: Subtask) => void;
}

export function SubtaskEditSidebar({ 
  open, 
  onOpenChange, 
  subtask, 
  profiles,
  onSave 
}: SubtaskEditSidebarProps) {
  const [editData, setEditData] = useState<Partial<Subtask & { planned_start_date: Date | null; planned_end_date: Date | null }>>({});

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
    if (subtask && open) {
      setEditData({
        ...subtask,
        planned_start_date: subtask.planned_start ? new Date(subtask.planned_start) : null,
        planned_end_date: subtask.planned_end ? new Date(subtask.planned_end) : null,
      });
    }
  }, [subtask, open]);

  const handleSave = () => {
    if (!subtask || !editData.title) {
      toast.error("Subtask title is required");
      return;
    }

    const updatedSubtask: Subtask = {
      ...subtask,
      title: editData.title || "",
      details: editData.details || null,
      planned_start: editData.planned_start_date?.toISOString().split('T')[0] || null,
      planned_end: editData.planned_end_date?.toISOString().split('T')[0] || null,
      planned_start_offset_days: editData.planned_start_offset_days || 0,
      planned_end_offset_days: editData.planned_end_offset_days || 1,
      position: editData.position || 1,
      technology_scope: editData.technology_scope || "both",
      assigned_role: editData.assigned_role || "implementation_lead",
      status: editData.status || "Planned",
      assignee: editData.assignee === 'unassigned' ? null : (editData.assignee || null),
    };

    onSave(updatedSubtask);
    onOpenChange(false);
    // Toast is now shown in the parent after successful DB save
  };

  const handleCancel = () => {
    onOpenChange(false);
    setEditData({});
  };

  if (!subtask) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Subtask</SheetTitle>
          <SheetDescription>
            Update the subtask details and configuration.
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

            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select 
                value={editData.status || "Planned"} 
                onValueChange={(value) => setEditData({ ...editData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Timing Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Timing Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-start-offset">Start Offset (days)</Label>
                <Input
                  id="edit-start-offset"
                  type="number"
                  value={editData.planned_start_offset_days || 0}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    planned_start_offset_days: parseInt(e.target.value) || 0 
                  })}
                />
              </div>
              
              <div>
                <Label htmlFor="edit-end-offset">End Offset (days)</Label>
                <Input
                  id="edit-end-offset"
                  type="number"
                  value={editData.planned_end_offset_days || 1}
                  onChange={(e) => setEditData({ 
                    ...editData, 
                    planned_end_offset_days: parseInt(e.target.value) || 1 
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Planned Start</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editData.planned_start_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData.planned_start_date ? format(editData.planned_start_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editData.planned_start_date || undefined}
                      onSelect={(date) => setEditData({ ...editData, planned_start_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Planned End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !editData.planned_end_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editData.planned_end_date ? format(editData.planned_end_date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editData.planned_end_date || undefined}
                      onSelect={(date) => setEditData({ ...editData, planned_end_date: date || null })}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
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

            <div>
              <Label htmlFor="edit-assignee">Assignee</Label>
              <Select 
                value={editData.assignee || 'unassigned'} 
                onValueChange={(value) => setEditData({ ...editData, assignee: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.name}
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