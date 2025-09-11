import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Filter, ArrowUpDown, ArrowUp, ArrowDown, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTasksStatus } from '@/hooks/useTaskStatus';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Task {
  id: string;
  task_title: string;
  task_details: string | null;
  step_name: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  status: string;
  assignee: string | null;
  project_id: string;
  project: {
    name: string;
    company: {
      name: string;
    };
  };
  assignee_profile?: {
    name: string;
  };
}

interface Profile {
  user_id: string;
  name: string;
}

const GlobalTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Compute task statuses using the custom hook
  const taskStatuses = useTasksStatus(tasks);
  const tasksWithComputedStatus = tasks.map((task, index) => ({
    ...task,
    computedStatus: taskStatuses[index]
  }));
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Task | 'project_name' | 'company_name' | 'assignee_name' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    project: 'all',
    company: 'all',
    step: 'all',
    task: '',
    status: 'all',
    assignee: 'all',
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
      fetchProfiles();
    }
  }, [user]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          id,
          task_title,
          task_details,
          step_name,
          planned_start,
          planned_end,
          actual_start,
          actual_end,
          status,
          assignee,
          project_id,
          project:projects(
            name,
            company:companies(name)
          ),
          assignee_profile:profiles!project_tasks_assignee_fkey(name)
        `)
        .order('planned_start', { ascending: true, nullsFirst: false })
        .order('step_name', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        toast({
          title: "Error",
          description: "Failed to fetch tasks. Please try again.",
          variant: "destructive",
        });
        return;
      }

      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks. Please try again.",
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
        .not('name', 'is', null);

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const handleSaveTask = async (updatedTask: Task) => {
    try {
      const { error } = await supabase.functions.invoke('update-task', {
        body: {
          taskId: updatedTask.id,
          updates: {
            task_title: updatedTask.task_title,
            task_details: updatedTask.task_details,
            planned_start: updatedTask.planned_start,
            planned_end: updatedTask.planned_end,
            actual_start: updatedTask.actual_start,
            actual_end: updatedTask.actual_end,
            status: updatedTask.status,
            assignee: updatedTask.assignee,
          },
        },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Task updated successfully.",
      });

      setIsEditDialogOpen(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error('Error updating task:', error);
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed on time':
        return 'default';
      case 'Completed Late':
        return 'destructive';
      case 'In Progress':
        return 'secondary';
      case 'Planned':
        return 'outline';
      case 'Overdue - Not Started On Time':
      case 'Overdue - Not Complete on Time':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const handleSort = (key: keyof Task | 'project_name' | 'company_name' | 'assignee_name') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: keyof Task | 'project_name' | 'company_name' | 'assignee_name') => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortConfig.direction === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const sortedAndFilteredTasks = () => {
    let filtered = showMyTasks 
      ? tasksWithComputedStatus.filter(task => task.assignee === user?.id)
      : tasksWithComputedStatus;

    // Apply filters
    filtered = filtered.filter(task => {
      const projectName = task.project?.name || '';
      const companyName = task.project?.company?.name || '';
      const assigneeName = task.assignee_profile?.name || '';
      
      return (
        (filters.project === 'all' || projectName.toLowerCase().includes(filters.project.toLowerCase())) &&
        (filters.company === 'all' || companyName.toLowerCase().includes(filters.company.toLowerCase())) &&
        (filters.step === 'all' || task.step_name.toLowerCase().includes(filters.step.toLowerCase())) &&
        task.task_title.toLowerCase().includes(filters.task.toLowerCase()) &&
        (filters.status === 'all' || task.computedStatus.status.toLowerCase().includes(filters.status.toLowerCase())) &&
        (filters.assignee === 'all' || assigneeName.toLowerCase().includes(filters.assignee.toLowerCase()))
      );
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'project_name':
            aValue = a.project?.name || '';
            bValue = b.project?.name || '';
            break;
          case 'company_name':
            aValue = a.project?.company?.name || '';
            bValue = b.project?.company?.name || '';
            break;
          case 'assignee_name':
            aValue = a.assignee_profile?.name || '';
            bValue = b.assignee_profile?.name || '';
            break;
          case 'status':
            aValue = a.computedStatus.status;
            bValue = b.computedStatus.status;
            break;
          case 'planned_start':
          case 'planned_end':
          case 'actual_start':
          case 'actual_end':
            aValue = a[sortConfig.key] ? new Date(a[sortConfig.key]!) : new Date(0);
            bValue = b[sortConfig.key] ? new Date(b[sortConfig.key]!) : new Date(0);
            break;
          default:
            aValue = a[sortConfig.key as keyof Task] || '';
            bValue = b[sortConfig.key as keyof Task] || '';
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  };

  const filteredTasks = sortedAndFilteredTasks();

  // Get unique values for filter dropdowns
  const uniqueProjects = [...new Set(tasksWithComputedStatus.map(task => task.project?.name).filter(name => name && name.trim() !== ''))];
  const uniqueCompanies = [...new Set(tasksWithComputedStatus.map(task => task.project?.company?.name).filter(name => name && name.trim() !== ''))];
  const uniqueSteps = [...new Set(tasksWithComputedStatus.map(task => task.step_name).filter(step => step && step.trim() !== ''))];
  const uniqueStatuses = [...new Set(tasksWithComputedStatus.map(task => task.computedStatus.status).filter(status => status && status.trim() !== ''))];
  const uniqueAssignees = [...new Set(tasksWithComputedStatus.map(task => task.assignee_profile?.name).filter(name => name && name.trim() !== ''))];

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold">Global Tasks</CardTitle>
            <Button
              variant={showMyTasks ? "default" : "outline"}
              onClick={() => setShowMyTasks(!showMyTasks)}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              {showMyTasks ? "Show All Tasks" : "Show My Tasks"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!loading && (
            <div className="mb-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Project</label>
                  <Select value={filters.project} onValueChange={(value) => setFilters(prev => ({ ...prev, project: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {uniqueProjects.map(project => (
                        <SelectItem key={project} value={project}>{project}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Company</label>
                  <Select value={filters.company} onValueChange={(value) => setFilters(prev => ({ ...prev, company: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All companies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All companies</SelectItem>
                      {uniqueCompanies.map(company => (
                        <SelectItem key={company} value={company}>{company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Step</label>
                  <Select value={filters.step} onValueChange={(value) => setFilters(prev => ({ ...prev, step: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All steps" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All steps</SelectItem>
                      {uniqueSteps.map(step => (
                        <SelectItem key={step} value={step}>{step}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Task</label>
                  <Input
                    placeholder="Filter tasks..."
                    value={filters.task}
                    onChange={(e) => setFilters(prev => ({ ...prev, task: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Status</label>
                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {uniqueStatuses.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Assignee</label>
                  <Select value={filters.assignee} onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="All assignees" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All assignees</SelectItem>
                      {uniqueAssignees.map(assignee => (
                        <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(Object.values(filters).some(f => f !== '' && f !== 'all') || sortConfig.key) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ project: 'all', company: 'all', step: 'all', task: '', status: 'all', assignee: 'all' });
                    setSortConfig({ key: null, direction: 'asc' });
                  }}
                >
                  Clear Filters & Sort
                </Button>
              )}
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-muted-foreground">Loading tasks...</div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Filter className="h-12 w-12 text-muted-foreground" />
              <div className="text-lg font-medium">No tasks found</div>
              <div className="text-muted-foreground text-center">
                {showMyTasks 
                  ? "You don't have any tasks assigned to you."
                  : "No tasks available for your accessible projects."
                }
              </div>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('project_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Project {getSortIcon('project_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('company_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Company {getSortIcon('company_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('step_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Step {getSortIcon('step_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('task_title')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Task {getSortIcon('task_title')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('status')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Status {getSortIcon('status')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('assignee_name')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Assignee {getSortIcon('assignee_name')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('planned_start')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Planned Start {getSortIcon('planned_start')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('planned_end')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Planned End {getSortIcon('planned_end')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('actual_start')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Actual Start {getSortIcon('actual_start')}
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        onClick={() => handleSort('actual_end')}
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                      >
                        Actual End {getSortIcon('actual_end')}
                      </Button>
                     </TableHead>
                     <TableHead>Actions</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="font-medium">
                        {task.project?.name || 'Unknown Project'}
                      </TableCell>
                      <TableCell>
                        {task.project?.company?.name || 'Unknown Company'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{task.step_name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.task_title}</div>
                          {task.task_details && (
                            <div className="text-sm text-muted-foreground">
                              {task.task_details.length > 50 
                                ? `${task.task_details.substring(0, 50)}...`
                                : task.task_details
                              }
                            </div>
                          )}
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className={task.computedStatus.bgColor}>
                           <Badge variant={getStatusBadgeVariant(task.computedStatus.status)}>
                             {task.computedStatus.status}
                           </Badge>
                         </div>
                       </TableCell>
                      <TableCell>
                        {task.assignee_profile?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>{formatDate(task.planned_start)}</TableCell>
                      <TableCell>{formatDate(task.planned_end)}</TableCell>
                      <TableCell>{formatDate(task.actual_start)}</TableCell>
                       <TableCell>{formatDate(task.actual_end)}</TableCell>
                       <TableCell>
                         <Button
                           variant="ghost"
                           size="sm"
                           onClick={() => handleEditTask(task)}
                           className="h-8 w-8 p-0"
                         >
                           <Edit className="h-4 w-4" />
                         </Button>
                       </TableCell>
                     </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <TaskEditDialog 
        task={editingTask}
        profiles={profiles}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />
    </div>
  );
};

interface TaskEditDialogProps {
  task: Task | null;
  profiles: Profile[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Task) => void;
}

const TaskEditDialog = ({ task, profiles, isOpen, onClose, onSave }: TaskEditDialogProps) => {
  const [formData, setFormData] = useState<Partial<Task>>({});

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
        assignee: task.assignee,
        step_name: task.step_name,
        project_id: task.project_id,
        project: task.project,
        assignee_profile: task.assignee_profile,
      });
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (task && formData.id) {
      onSave(formData as Task);
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="task_title">Task Title</Label>
              <Input
                id="task_title"
                value={formData.task_title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, task_title: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="assignee">Assignee</Label>
              <Select
                value={formData.assignee || ''}
                onValueChange={(value) => setFormData(prev => ({ ...prev, assignee: value || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.user_id} value={profile.user_id}>
                      {profile.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="task_details">Task Details</Label>
            <Textarea
              id="task_details"
              value={formData.task_details || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, task_details: e.target.value }))}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Planned Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.planned_start ? format(new Date(formData.planned_start), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.planned_start ? new Date(formData.planned_start) : undefined}
                    onSelect={(date) => handleDateChange('planned_start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Planned End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.planned_end ? format(new Date(formData.planned_end), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.planned_end ? new Date(formData.planned_end) : undefined}
                    onSelect={(date) => handleDateChange('planned_end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Actual Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.actual_start ? format(new Date(formData.actual_start), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.actual_start ? new Date(formData.actual_start) : undefined}
                    onSelect={(date) => handleDateChange('actual_start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Actual End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.actual_end ? format(new Date(formData.actual_end), 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.actual_end ? new Date(formData.actual_end) : undefined}
                    onSelect={(date) => handleDateChange('actual_end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status || ''}
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planned">Planned</SelectItem>
                <SelectItem value="In Progress">In Progress</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GlobalTasks;