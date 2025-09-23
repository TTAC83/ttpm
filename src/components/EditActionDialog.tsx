import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { DatePicker } from "@/components/ui/date-picker";

interface Action {
  id: string;
  title: string;
  details: string | null;
  status: string;
  planned_date: string | null;
  is_critical: boolean;
  assignee: string | null;
  created_at: string;
  notes?: string | null;
}

interface Profile {
  user_id: string;
  name: string;
}

interface EditActionDialogProps {
  action: Action;
  profiles: Profile[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: any) => void;
}

export function EditActionDialog({ 
  action,
  profiles, 
  open,
  onOpenChange,
  onSave
}: EditActionDialogProps) {
  const normalizeStatus = (s: string) => {
    if (s === 'Completed' || s === 'Complete') return 'Done';
    if (s === 'Not Started') return 'Open';
    if (s === 'Cancelled') return 'Done';
    return s;
  };
  const [formData, setFormData] = useState({
    title: action.title,
    details: action.details || '',
    assignee: action.assignee || 'unassigned',
    planned_date: action.planned_date ? new Date(action.planned_date) : undefined as Date | undefined,
    notes: action.notes || '',
    status: normalizeStatus(action.status),
    is_critical: action.is_critical,
  });
  const [loading, setLoading] = useState(false);

  const toISODateStringLocal = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave({
        title: formData.title,
        details: formData.details || null,
        assignee: formData.assignee === 'unassigned' ? null : formData.assignee,
        planned_date: formData.planned_date ? toISODateStringLocal(formData.planned_date) : null,
        notes: formData.notes || null,
        status: formData.status,
        is_critical: formData.is_critical,
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Action</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter action title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-details">Details</Label>
            <Textarea
              id="edit-details"
              value={formData.details}
              onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
              placeholder="Enter action details"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-assignee">Assignee</Label>
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
              <Label>Planned Date</Label>
              <DatePicker
                value={formData.planned_date}
                onChange={(date) => setFormData(prev => ({ ...prev, planned_date: date }))}
                placeholder="Select planned date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Open">Open</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-critical"
                  checked={formData.is_critical}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_critical: checked }))}
                />
                <Label htmlFor="edit-critical">Critical Action</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
            />
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