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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK, toISODateString } from '@/lib/dateUtils';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Filter, Users, Edit, CalendarIcon, Save, X, List } from 'lucide-react';
import SubtasksDialog from '@/components/SubtasksDialog';

interface Task {
  id: string;
  step_name: string;
  task_title: string;
  task_details: string | null;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  assignee: string | null;
  master_task_id: number | null;
  profiles: {
    name: string | null;
  } | null;
}

interface Profile {
  user_id: string;
  name: string | null;
}

interface ProjectTasksProps {
  projectId: string;
}

const ProjectTasks = ({ projectId }: ProjectTasksProps) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [isProjectMember, setIsProjectMember] = useState(false);
  const [subtasksDialogOpen, setSubtasksDialogOpen] = useState(false);
  const [selectedTaskForSubtasks, setSelectedTaskForSubtasks] = useState<{ id: string; title: string } | null>(null);
  const [filters, setFilters] = useState({
    step_name: 'all',
    status: 'all',
    assignee: 'all',
  });

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
    checkProjectMembership();
  }, [projectId, user]);

  const fetchTasks = async () => {
    try {
      console.log('ProjectTasks: Starting to fetch tasks for project:', projectId);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          *,
          profiles:assignee (
            name
          ),
          master_tasks (
            master_steps (
              position
            )
          )
        `)
        .eq('project_id', projectId)
        .order('planned_start');

      console.log('ProjectTasks: Query response:', { data, error });

      if (error) throw error;
      
      // Sort by step position in JavaScript
      const sortedTasks = (data || []).sort((a, b) => {
        const positionA = a.master_tasks?.master_steps?.position || 999;
        const positionB = b.master_tasks?.master_steps?.position || 999;
        return positionA - positionB;
      });
      
      setTasks(sortedTasks);
    } catch (error: any) {
      console.error('ProjectTasks: Error fetching tasks:', error);
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
    } catch (error: any) {
      console.error('Failed to fetch profiles:', error);
    }
  };

  const checkProjectMembership = async () => {
    if (!user || profile?.is_internal) {
      setIsProjectMember(true); // Internal users can edit all
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

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
  };

  const handleViewSubtasks = (task: Task) => {
    setSelectedTaskForSubtasks({ id: task.id, title: task.task_title });
    setSubtasksDialogOpen(true);
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    if (!editingTask) return;

    setFormLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const { data, error } = await supabase.functions.invoke('update-task', {
        body: {
          id: editingTask.id,
          ...taskData
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
      });

      setEditingTask(null);
      fetchTasks();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Done': return 'default';
      case 'In Progress': return 'secondary';
      case 'Blocked': return 'destructive';
      case 'Planned': return 'outline';
      default: return 'outline';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filters.step_name && filters.step_name !== 'all' && task.step_name !== filters.step_name) return false;
    if (filters.status && filters.status !== 'all' && task.status !== filters.status) return false;
    if (filters.assignee && filters.assignee !== 'all' && task.assignee !== filters.assignee) return false;
    return true;
  });

  const canEditTasks = profile?.is_internal || isProjectMember;

  const uniqueSteps = [...new Set(tasks.map(task => task.step_name))];
  const uniqueStatuses = [...new Set(tasks.map(task => task.status))];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Step</Label>
              <Select value={filters.step_name} onValueChange={(value) => setFilters(prev => ({ ...prev, step_name: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All steps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All steps</SelectItem>
                  {uniqueSteps.map((step) => (
                    <SelectItem key={step} value={step}>
                      {step}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {uniqueStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Select value={filters.assignee} onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
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
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Project Tasks</CardTitle>
              <CardDescription>
                Track planned and actual dates for all project tasks
              </CardDescription>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredTasks.length} of {tasks.length} tasks
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Step</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Planned Start</TableHead>
                    <TableHead>Planned End</TableHead>
                    <TableHead>Actual Start</TableHead>
                    <TableHead>Actual End</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">
                            {filters.step_name || filters.status || filters.assignee 
                              ? 'No tasks match the current filters' 
                              : 'No tasks found for this project'
                            }
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-accent">
                        <TableCell className="font-medium">{task.step_name}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{task.task_title}</p>
                            {task.task_details && (
                              <p className="text-sm text-muted-foreground truncate max-w-xs">
                                {task.task_details}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(task.status)}>
                            {task.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.profiles?.name || (task.assignee ? 'Unknown User' : 'Unassigned')}</TableCell>
                        <TableCell>{task.planned_start ? formatDateUK(task.planned_start) : '-'}</TableCell>
                        <TableCell>{task.planned_end ? formatDateUK(task.planned_end) : '-'}</TableCell>
                        <TableCell>{task.actual_start ? formatDateUK(task.actual_start) : '-'}</TableCell>
                        <TableCell>{task.actual_end ? formatDateUK(task.actual_end) : '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewSubtasks(task)}
                              title="View Subtasks"
                            >
                              <List className="h-4 w-4" />
                            </Button>
                            {canEditTasks && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTask(task)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          profiles={profiles}
          onSave={handleSaveTask}
          onClose={() => setEditingTask(null)}
          loading={formLoading}
        />
      )}

      {/* Subtasks Dialog */}
      {selectedTaskForSubtasks && (
        <SubtasksDialog
          open={subtasksDialogOpen}
          onOpenChange={setSubtasksDialogOpen}
          taskId={selectedTaskForSubtasks.id}
          taskTitle={selectedTaskForSubtasks.title}
        />
      )}
    </div>
  );
};

// Task Edit Dialog Component
const TaskEditDialog = ({ 
  task, 
  profiles, 
  onSave, 
  onClose, 
  loading 
}: {
  task: Task;
  profiles: Profile[];
  onSave: (data: Partial<Task>) => void;
  onClose: () => void;
  loading: boolean;
}) => {
  const [formData, setFormData] = useState({
    task_title: task.task_title,
    task_details: task.task_details || '',
    planned_start: task.planned_start || '',
    planned_end: task.planned_end || '',
    actual_start: task.actual_start || '',
    actual_end: task.actual_end || '',
    status: task.status,
    assignee: task.assignee || '',
  });

  const [datePopoverOpen, setDatePopoverOpen] = useState({
    planned_start: false,
    planned_end: false,
    actual_start: false,
    actual_end: false,
  });

  const handleDateSelect = (field: string, date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [field]: toISODateString(date)
      }));
    }
    setDatePopoverOpen(prev => ({ ...prev, [field]: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Update task details and progress
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task_title">Task Title</Label>
              <Input
                id="task_title"
                value={formData.task_title}
                onChange={(e) => setFormData(prev => ({ ...prev, task_title: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planned">Planned</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="task_details">Task Details</Label>
              <Input
                id="task_details"
                value={formData.task_details}
                onChange={(e) => setFormData(prev => ({ ...prev, task_details: e.target.value }))}
                placeholder="Enter task details"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={formData.assignee} onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value === "unassigned" ? "" : value }))}>
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

            {/* Planned Start Date */}
            <div className="space-y-2">
              <Label>Planned Start</Label>
              <Popover open={datePopoverOpen.planned_start} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, planned_start: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.planned_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.planned_start ? formatDateUK(formData.planned_start) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.planned_start ? new Date(formData.planned_start) : undefined}
                    onSelect={(date) => handleDateSelect('planned_start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Planned End Date */}
            <div className="space-y-2">
              <Label>Planned End</Label>
              <Popover open={datePopoverOpen.planned_end} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, planned_end: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.planned_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.planned_end ? formatDateUK(formData.planned_end) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.planned_end ? new Date(formData.planned_end) : undefined}
                    onSelect={(date) => handleDateSelect('planned_end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actual Start Date */}
            <div className="space-y-2">
              <Label>Actual Start</Label>
              <Popover open={datePopoverOpen.actual_start} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, actual_start: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.actual_start && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.actual_start ? formatDateUK(formData.actual_start) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.actual_start ? new Date(formData.actual_start) : undefined}
                    onSelect={(date) => handleDateSelect('actual_start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actual End Date */}
            <div className="space-y-2">
              <Label>Actual End</Label>
              <Popover open={datePopoverOpen.actual_end} onOpenChange={(open) => setDatePopoverOpen(prev => ({ ...prev, actual_end: open }))}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.actual_end && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.actual_end ? formatDateUK(formData.actual_end) : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.actual_end ? new Date(formData.actual_end) : undefined}
                    onSelect={(date) => handleDateSelect('actual_end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectTasks;
