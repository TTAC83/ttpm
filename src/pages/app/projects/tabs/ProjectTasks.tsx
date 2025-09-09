import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { Filter, Users } from 'lucide-react';

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
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    step_name: '',
    status: '',
    assignee: '',
  });

  useEffect(() => {
    fetchTasks();
    fetchProfiles();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('project_tasks')
        .select(`
          *,
          profiles:assignee (
            name
          )
        `)
        .eq('project_id', projectId)
        .order('step_name')
        .order('planned_start');

      if (error) throw error;
      setTasks(data || []);
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
    if (filters.step_name && task.step_name !== filters.step_name) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.assignee && task.assignee !== filters.assignee) return false;
    return true;
  });

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
              <Select value={filters.step_name} onValueChange={(value) => setFilters(prev => ({ ...prev, step_name: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All steps" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All steps</SelectItem>
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
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
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
              <Select value={filters.assignee} onValueChange={(value) => setFilters(prev => ({ ...prev, assignee: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All assignees</SelectItem>
                  {profiles.map((profile) => (
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
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
                      <TableRow key={task.id}>
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
                          {task.profiles?.name || (task.assignee ? 'Unknown User' : 'Unassigned')}
                        </TableCell>
                        <TableCell>{task.planned_start ? formatDateUK(task.planned_start) : '-'}</TableCell>
                        <TableCell>{task.planned_end ? formatDateUK(task.planned_end) : '-'}</TableCell>
                        <TableCell>{task.actual_start ? formatDateUK(task.actual_start) : '-'}</TableCell>
                        <TableCell>{task.actual_end ? formatDateUK(task.actual_end) : '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProjectTasks;