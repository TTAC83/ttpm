import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Filter } from 'lucide-react';
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

  const filteredTasks = showMyTasks 
    ? tasks.filter(task => task.assignee === user?.id)
    : tasks;

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
                    <TableHead>Project</TableHead>
                    <TableHead>Company</TableHead>
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