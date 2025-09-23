import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface Task {
  id: string;
  task_title: string;
  task_details?: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  status: string;
  assignee?: string;
  step_name?: string;
  project_id: string;
}

interface Profile {
  user_id: string;
  name: string;
}

interface TaskEditDialogProps {
  task: Task | null;
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (task: Task) => void;
}

export function TaskEditDialog({ task, profiles, open, onOpenChange, onSave }: TaskEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Task>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        id: task.id,
        task_title: task.task_title,
        task_details: task.task_details,
        planned_start: task.planned_start,
        planned_end: task.planned_end,
        actual_start: task.actual_start,
        actual_end: task.actual_end,
        status: task.status,
        assignee: task.assignee || 'unassigned',
        step_name: task.step_name,
        project_id: task.project_id,
      });
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (task && formData.id) {
      setLoading(true);
      try {
        await onSave({
          ...formData,
          assignee: formData.assignee === 'unassigned' ? null : formData.assignee,
        } as Task);
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDateChange = (field: string, date: Date | undefined) => {
    setFormData(prev => ({
      ...prev,
      [field]: date ? date.toISOString().split('T')[0] : null
    }));
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="task-title">Task Title *</Label>
            <Input
              id="task-title"
              value={formData.task_title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, task_title: e.target.value }))}
              placeholder="Enter task title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-details">Task Details</Label>
            <Textarea
              id="task-details"
              value={formData.task_details || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, task_details: e.target.value }))}
              placeholder="Enter task details"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={formData.assignee} onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">No assignee</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planned Start</Label>
              <DatePicker
                value={formData.planned_start ? new Date(formData.planned_start) : null}
                onChange={(date) => handleDateChange('planned_start', date)}
                placeholder="Select planned start date"
              />
            </div>

            <div className="space-y-2">
              <Label>Planned End</Label>
              <DatePicker
                value={formData.planned_end ? new Date(formData.planned_end) : null}
                onChange={(date) => handleDateChange('planned_end', date)}
                placeholder="Select planned end date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Actual Start</Label>
              <DatePicker
                value={formData.actual_start ? new Date(formData.actual_start) : null}
                onChange={(date) => handleDateChange('actual_start', date)}
                placeholder="Select actual start date"
              />
            </div>

            <div className="space-y-2">
              <Label>Actual End</Label>
              <DatePicker
                value={formData.actual_end ? new Date(formData.actual_end) : null}
                onChange={(date) => handleDateChange('actual_end', date)}
                placeholder="Select actual end date"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}