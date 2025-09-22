import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, CalendarIcon, Calendar as CalendarPlus } from 'lucide-react';
import CreateEventDialog from '@/components/CreateEventDialog';
import { format } from 'date-fns';
import { formatDateUK } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';

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

interface SubtasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
  projectId?: string;
}

const SubtasksDialog = ({ open, onOpenChange, taskId, taskTitle, projectId }: SubtasksDialogProps) => {
  const { toast } = useToast();
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const [createEventDialogOpen, setCreateEventDialogOpen] = useState(false);
  const [selectedSubtaskForEvent, setSelectedSubtaskForEvent] = useState<{ title: string } | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    planned_start: null as Date | null,
    planned_end: null as Date | null,
    planned_start_offset_days: 0,
    planned_end_offset_days: 1,
    position: 1,
    technology_scope: 'both',
    assigned_role: 'implementation_lead',
    status: 'Planned' as 'Planned' | 'In Progress' | 'Blocked' | 'Done',
    assignee: 'unassigned' as string,
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

  useEffect(() => {
    if (open) {
      fetchSubtasks();
      fetchProfiles();
    }
  }, [open, taskId]);

  const fetchSubtasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('subtasks')
        .select(`
          *,
          profiles:assignee (
            name
          )
        `)
        .eq('task_id', taskId)
        .order('position', { ascending: true });

      if (error) throw error;
      setSubtasks(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch subtasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .order('name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSubtask) {
        // Update existing subtask
        const { error } = await supabase
          .from('subtasks')
          .update({
            title: formData.title,
            details: formData.details || null,
            planned_start: formData.planned_start?.toISOString().split('T')[0] || null,
            planned_end: formData.planned_end?.toISOString().split('T')[0] || null,
            planned_start_offset_days: formData.planned_start_offset_days,
            planned_end_offset_days: formData.planned_end_offset_days,
            position: formData.position,
            technology_scope: formData.technology_scope,
            assigned_role: formData.assigned_role,
            status: formData.status as any,
            assignee: formData.assignee === 'unassigned' ? null : formData.assignee,
          })
          .eq('id', editingSubtask.id);

        if (error) throw error;

        toast({
          title: "Subtask Updated",
          description: "Subtask has been updated successfully",
        });
      } else {
        // Create new subtask
        const { error } = await supabase
          .from('subtasks')
          .insert({
            task_id: taskId,
            title: formData.title,
            details: formData.details || null,
            planned_start: formData.planned_start?.toISOString().split('T')[0] || null,
            planned_end: formData.planned_end?.toISOString().split('T')[0] || null,
            planned_start_offset_days: formData.planned_start_offset_days,
            planned_end_offset_days: formData.planned_end_offset_days,
            position: formData.position,
            technology_scope: formData.technology_scope,
            assigned_role: formData.assigned_role,
            status: formData.status as any,
            assignee: formData.assignee === 'unassigned' ? null : formData.assignee,
          });

        if (error) throw error;

        toast({
          title: "Subtask Created",
          description: "New subtask has been created successfully",
        });
      }

      setAddingSubtask(false);
      setEditingSubtask(null);
      setFormData({
        title: '',
        details: '',
        planned_start: null,
        planned_end: null,
        planned_start_offset_days: 0,
        planned_end_offset_days: 1,
        position: subtasks.length + 1,
        technology_scope: 'both',
        assigned_role: 'implementation_lead',
        status: 'Planned',
        assignee: 'unassigned',
      });
      fetchSubtasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subtask",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (subtask: Subtask) => {
    setEditingSubtask(subtask);
    setFormData({
      title: subtask.title,
      details: subtask.details || '',
      planned_start: subtask.planned_start ? new Date(subtask.planned_start) : null,
      planned_end: subtask.planned_end ? new Date(subtask.planned_end) : null,
      planned_start_offset_days: subtask.planned_start_offset_days || 0,
      planned_end_offset_days: subtask.planned_end_offset_days || 1,
      position: subtask.position || 1,
      technology_scope: subtask.technology_scope || 'both',
      assigned_role: subtask.assigned_role || 'implementation_lead',
      status: subtask.status as 'Planned' | 'In Progress' | 'Blocked' | 'Done',
      assignee: subtask.assignee || 'unassigned',
    });
    setAddingSubtask(true);
  };

  const handleDelete = async (subtaskId: string) => {
    if (!confirm('Are you sure you want to delete this subtask?')) return;

    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;

      toast({
        title: "Subtask Deleted",
        description: "Subtask has been deleted successfully",
      });

      fetchSubtasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subtask",
        variant: "destructive",
      });
    }
  };

  const handleNewSubtask = () => {
    setEditingSubtask(null);
    setFormData({
      title: '',
      details: '',
      planned_start: null,
      planned_end: null,
      planned_start_offset_days: 0,
      planned_end_offset_days: 1,
      position: subtasks.length + 1,
      technology_scope: 'both',
      assigned_role: 'implementation_lead',
      status: 'Planned' as 'Planned' | 'In Progress' | 'Blocked' | 'Done',
      assignee: 'unassigned',
    });
    setAddingSubtask(true);
  };

  const handleCreateEventForSubtask = (subtask: Subtask) => {
    setSelectedSubtaskForEvent({ title: subtask.title });
    setCreateEventDialogOpen(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subtasks for: {taskTitle}</DialogTitle>
          <DialogDescription>
            Manage subtasks and track detailed progress
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add/Edit Subtask Form */}
          {addingSubtask && (
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-semibold">
                {editingSubtask ? 'Edit Subtask' : 'Add New Subtask'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Enter subtask title"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'Planned' | 'In Progress' | 'Blocked' | 'Done' }))}>
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

                <div className="space-y-2">
                  <Label htmlFor="details">Details</Label>
                  <Textarea
                    id="details"
                    value={formData.details}
                    onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
                    placeholder="Enter subtask details"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="start-offset">Start Offset (days)</Label>
                    <Input
                      id="start-offset"
                      type="number"
                      value={formData.planned_start_offset_days}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        planned_start_offset_days: parseInt(e.target.value) || 0 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end-offset">End Offset (days)</Label>
                    <Input
                      id="end-offset"
                      type="number"
                      value={formData.planned_end_offset_days}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        planned_end_offset_days: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="position">Position</Label>
                    <Input
                      id="position"
                      type="number"
                      min="1"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        position: parseInt(e.target.value) || 1 
                      }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="technology-scope">Technology Scope</Label>
                    <Select 
                      value={formData.technology_scope} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, technology_scope: value }))}
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
                  <div className="space-y-2">
                    <Label htmlFor="assigned-role">Assigned Role</Label>
                    <Select 
                      value={formData.assigned_role} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, assigned_role: value }))}
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

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Planned Start</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.planned_start && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.planned_start ? format(formData.planned_start, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.planned_start || undefined}
                          onSelect={(date) => setFormData(prev => ({ ...prev, planned_start: date || null }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Planned End</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.planned_end && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.planned_end ? format(formData.planned_end, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.planned_end || undefined}
                          onSelect={(date) => setFormData(prev => ({ ...prev, planned_end: date || null }))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="assignee">Assignee</Label>
                    <Select value={formData.assignee} onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value }))}>
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

                <div className="flex gap-2">
                  <Button type="submit">
                    {editingSubtask ? 'Update Subtask' : 'Create Subtask'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setAddingSubtask(false);
                      setEditingSubtask(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Subtasks List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Subtasks ({subtasks.length})
              </h3>
              {!addingSubtask && (
                <Button onClick={handleNewSubtask} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subtask
                </Button>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : subtasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No subtasks yet</p>
                <Button onClick={handleNewSubtask} size="sm" className="mt-2">
                  Add First Subtask
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Offsets</TableHead>
                    <TableHead>Tech Scope</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Planned Dates</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subtasks.map((subtask) => (
                    <TableRow key={subtask.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subtask.title}</div>
                          {subtask.details && (
                            <div className="text-sm text-muted-foreground">{subtask.details}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{subtask.position || '-'}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {subtask.planned_start_offset_days || 0} - {subtask.planned_end_offset_days || 1} days
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {technologyScopeOptions.find(opt => opt.value === subtask.technology_scope)?.label || 'Both IoT & Vision'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {assignedRoleOptions.find(opt => opt.value === subtask.assigned_role)?.label || 'Implementation Lead'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs ${
                          subtask.status === 'Done' ? 'bg-green-100 text-green-700' :
                          subtask.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                          subtask.status === 'Blocked' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {subtask.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {subtask.profiles?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {subtask.planned_start ? formatDateUK(subtask.planned_start) : '-'}
                          {subtask.planned_end && (
                            <div className="text-muted-foreground">to {formatDateUK(subtask.planned_end)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(subtask)}
                            title="Edit Subtask"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {projectId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCreateEventForSubtask(subtask)}
                              title="Create Calendar Event"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(subtask.id)}
                            title="Delete Subtask"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* Create Event Dialog */}
        {projectId && (
          <CreateEventDialog
            open={createEventDialogOpen}
            onOpenChange={setCreateEventDialogOpen}
            projectId={projectId}
            prefilledTitle={selectedSubtaskForEvent?.title || ''}
            onEventCreated={() => {
              setCreateEventDialogOpen(false);
              setSelectedSubtaskForEvent(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SubtasksDialog;