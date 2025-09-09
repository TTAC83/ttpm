import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatDateUK } from '@/lib/dateUtils';
import { Plus, FileText, Calendar } from 'lucide-react';

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

interface ProjectActionsProps {
  projectId: string;
}

const ProjectActions = ({ projectId }: ProjectActionsProps) => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  useEffect(() => {
    if (selectedTaskId) {
      fetchActions(selectedTaskId);
    } else {
      setActions([]);
    }
  }, [selectedTaskId]);

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
      
      // Auto-select first task if available
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Done': return 'default';
      case 'In Progress': return 'secondary';
      case 'Open': return 'outline';
      default: return 'outline';
    }
  };

  const selectedTask = tasks.find(task => task.id === selectedTaskId);

  return (
    <div className="space-y-6">
      {/* Task Selection */}
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

      {/* Actions List */}
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
              <Button disabled>
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
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
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {actions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No actions found for this task</p>
                          <Button size="sm" disabled>
                            <Plus className="h-4 w-4 mr-2" />
                            Add First Action
                          </Button>
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
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {formatDateUK(action.planned_date)}
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{formatDateUK(action.created_at)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" disabled>
                            Edit
                          </Button>
                        </TableCell>
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
    </div>
  );
};

export default ProjectActions;