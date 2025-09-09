import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK, toISODateString } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Plus, FileText, Calendar as CalendarIcon, Save, X, Edit } from 'lucide-react';

interface Task {
  id: string;
  step_name: string;
  task_title: string;
  status: string;
}

interface Action {
  id: string;
  title: string;
  details: string | null;
  assignee: string | null;
  planned_date: string | null;
  notes: string | null;
  status: string;
  project_task_id: string;
  created_at: string;
  profiles: {
    name: string | null;
  } | null;
}

interface Profile {
  user_id: string;
  name: string | null;
}

interface ProjectActionsProps {
  projectId: string;
}

const ProjectActions = ({ projectId }: ProjectActionsProps) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<Action | null>(null);
  const [isProjectMember, setIsProjectMember] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    checkProjectMembership();
  }, [projectId, user]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchActions(selectedTaskId);
    } else {
      setActions([]);
    }
  }, [selectedTaskId]);

  const checkProjectMembership = async () => {
    if (!user || profile?.is_internal) {
      setIsProjectMember(true);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();

      setIsProjectMember(!!data && !error);
    } catch (error) {
      setIsProjectMember(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_tasks')
        .select('id, step_name, task_title, status')
        .eq('project_id', projectId)
        .order('step_name')
        .order('task_title');

      if (error) throw error;
      setTasks(data || []);
      
      if (data && data.length > 0) {
        setSelectedTaskId(data[0].id);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
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

  const fetchActions = async (taskId: string) => {
    try {
      const { data, error } = await supabase
        .from('actions')
        .select(`
          *,
          profiles:assignee (
            name
          )
        `)
        .eq('project_task_id', taskId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setActions(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch actions",
        variant: "destructive",
      });
    }
  };

  const handleCreateAction = async (actionData: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('create-action', {
        body: {
          project_task_id: selectedTaskId,
          ...actionData
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Action Created",
        description: "New action has been created successfully",
      });

      setDialogOpen(false);
      fetchActions(selectedTaskId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create action",
        variant: "destructive",
      });
    }
  };

  const handleEditAction = (action: Action) => {
    setEditingAction(action);
    setEditDialogOpen(true);
  };

  const handleUpdateAction = async (actionData: any) => {
    if (!editingAction) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      // For now, we'll use the same edge function but pass the action ID
      const { data, error } = await supabase.functions.invoke('create-action', {
        body: {
          id: editingAction.id,
          ...actionData,
          isUpdate: true
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Action Updated",
        description: "Action has been updated successfully",
      });

      setEditDialogOpen(false);
      setEditingAction(null);
      fetchActions(selectedTaskId);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update action",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Done': return 'default';
      case 'In Progress': return 'secondary';
      case 'Open': return 'outline';
      default: return 'outline';
    }
  };

  const selectedTask = tasks.find(task => task.id === selectedTaskId);
  const canManageActions = profile?.is_internal || isProjectMember;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Select Task</CardTitle>
          <CardDescription>
            Choose a task to view and manage its actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((task) => (
                  <SelectItem key={task.id} value={task.id}>
                    <div className="flex items-center gap-2">
                      <span>{task.step_name}</span>
                      <span className="text-muted-foreground">-</span>
                      <span>{task.task_title}</span>
                      <Badge variant="outline" className="ml-2">
                        {task.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selectedTaskId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Actions for {selectedTask?.task_title}</CardTitle>
                <CardDescription>
                  Manage action items and track progress
                </CardDescription>
              </div>
              {canManageActions && (
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Action
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <CreateActionDialog
                      profiles={profiles}
                      onSave={handleCreateAction}
                      onClose={() => setDialogOpen(false)}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Planned Date</TableHead>
                    <TableHead>Created</TableHead>
                    {canManageActions && <TableHead>Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={canManageActions ? 6 : 5} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No actions found for this task</p>
                          {canManageActions && (
                            <Button size="sm" onClick={() => setDialogOpen(true)}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add First Action
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{action.title}</p>
                            {action.details && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {action.details}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(action.status)}>
                            {action.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {action.profiles?.name || (action.assignee ? 'Unknown User' : 'Unassigned')}
                        </TableCell>
                        <TableCell>
                          {action.planned_date ? (
                            <div className="flex items-center gap-2">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {formatDateUK(action.planned_date)}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{formatDateUK(action.created_at)}</TableCell>
                         {canManageActions && (
                           <TableCell>
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               onClick={() => handleEditAction(action)}
                             >
                               <Edit className="h-4 w-4" />
                             </Button>
                           </TableCell>
                         )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {!selectedTaskId && !loading && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-muted-foreground">Select a task to view its actions</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Action Dialog */}
      {editingAction && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <EditActionDialog
              action={editingAction}
              profiles={profiles}
              onSave={handleUpdateAction}
              onClose={() => {
                setEditDialogOpen(false);
                setEditingAction(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Create Action Dialog Component
const CreateActionDialog = ({ 
  profiles, 
  onSave, 
  onClose 
}: {
  profiles: Profile[];
  onSave: (data: any) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: '',
    details: '',
    assignee: '',
    planned_date: undefined as Date | undefined,
    notes: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave({
        title: formData.title,
        details: formData.details || null,
        assignee: formData.assignee || null,
        planned_date: formData.planned_date ? toISODateString(formData.planned_date) : null,
        notes: formData.notes || null,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Action</DialogTitle>
        <DialogDescription>
          Add a new action item for this task
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter action title"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="details">Details</Label>
          <Textarea
            id="details"
            value={formData.details}
            onChange={(e) => setFormData(prev => ({ ...prev, details: e.target.value }))}
            placeholder="Enter action details"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select 
              value={formData.assignee || 'unassigned'} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value === 'unassigned' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {profiles
                  .filter((profile) => profile.user_id && profile.user_id.trim() !== '')
                  .map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.name || 'Unnamed User'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Planned Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.planned_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.planned_date ? format(formData.planned_date, "dd/MM/yyyy") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.planned_date}
                  onSelect={(date) => setFormData(prev => ({ ...prev, planned_date: date }))}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes"
            rows={2}
          />
        </div>

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading || !formData.title}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Creating...' : 'Create Action'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
};

// Edit Action Dialog Component
const EditActionDialog = ({ 
  action,
  profiles, 
  onSave, 
  onClose 
}: {
  action: Action;
  profiles: Profile[];
  onSave: (data: any) => void;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    title: action.title,
    details: action.details || '',
    assignee: action.assignee || '',
    planned_date: action.planned_date ? new Date(action.planned_date) : undefined as Date | undefined,
    notes: action.notes || '',
    status: action.status,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await onSave({
        title: formData.title,
        details: formData.details || null,
        assignee: formData.assignee || null,
        planned_date: formData.planned_date ? toISODateString(formData.planned_date) : null,
        notes: formData.notes || null,
        status: formData.status,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Action</DialogTitle>
        <DialogDescription>
          Update action details and status
        </DialogDescription>
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

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Assignee</Label>
            <Select 
              value={formData.assignee || 'unassigned'} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value === 'unassigned' ? '' : value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {profiles
                  .filter((profile) => profile.user_id && profile.user_id.trim() !== '')
                  .map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.name || 'Unnamed User'}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Planned Date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.planned_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.planned_date ? format(formData.planned_date, "dd/MM/yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={formData.planned_date}
                onSelect={(date) => setFormData(prev => ({ ...prev, planned_date: date }))}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
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

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={loading || !formData.title}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Updating...' : 'Update Action'}
          </Button>
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </>
  );
};

export default ProjectActions;