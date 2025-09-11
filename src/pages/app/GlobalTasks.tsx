import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Filter, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const GlobalTasks = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Task | 'project_name' | 'company_name' | 'assignee_name' | null;
    direction: 'asc' | 'desc';
  }>({ key: null, direction: 'asc' });
  const [filters, setFilters] = useState({
    project: '',
    company: '',
    step: '',
    task: '',
    status: '',
    assignee: '',
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Planned':
        return 'outline';
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
      ? tasks.filter(task => task.assignee === user?.id)
      : tasks;

    // Apply filters
    filtered = filtered.filter(task => {
      const projectName = task.project?.name || '';
      const companyName = task.project?.company?.name || '';
      const assigneeName = task.assignee_profile?.name || '';
      
      return (
        projectName.toLowerCase().includes(filters.project.toLowerCase()) &&
        companyName.toLowerCase().includes(filters.company.toLowerCase()) &&
        task.step_name.toLowerCase().includes(filters.step.toLowerCase()) &&
        task.task_title.toLowerCase().includes(filters.task.toLowerCase()) &&
        task.status.toLowerCase().includes(filters.status.toLowerCase()) &&
        assigneeName.toLowerCase().includes(filters.assignee.toLowerCase())
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
  const uniqueProjects = [...new Set(tasks.map(task => task.project?.name).filter(Boolean))];
  const uniqueCompanies = [...new Set(tasks.map(task => task.project?.company?.name).filter(Boolean))];
  const uniqueSteps = [...new Set(tasks.map(task => task.step_name))];
  const uniqueStatuses = [...new Set(tasks.map(task => task.status))];
  const uniqueAssignees = [...new Set(tasks.map(task => task.assignee_profile?.name).filter(Boolean))];

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
                      <SelectItem value="">All projects</SelectItem>
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
                      <SelectItem value="">All companies</SelectItem>
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
                      <SelectItem value="">All steps</SelectItem>
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
                      <SelectItem value="">All statuses</SelectItem>
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
                      <SelectItem value="">All assignees</SelectItem>
                      {uniqueAssignees.map(assignee => (
                        <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(Object.values(filters).some(f => f !== '') || sortConfig.key) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ project: '', company: '', step: '', task: '', status: '', assignee: '' });
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
                        <Badge variant={getStatusBadgeVariant(task.status)}>
                          {task.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {task.assignee_profile?.name || 'Unassigned'}
                      </TableCell>
                      <TableCell>{formatDate(task.planned_start)}</TableCell>
                      <TableCell>{formatDate(task.planned_end)}</TableCell>
                      <TableCell>{formatDate(task.actual_start)}</TableCell>
                      <TableCell>{formatDate(task.actual_end)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GlobalTasks;