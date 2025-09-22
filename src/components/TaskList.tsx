import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTaskStatus } from '@/hooks/useTaskStatus';
import { cn } from '@/lib/utils';
import { parseISO, format } from 'date-fns';

interface Task {
  id: string;
  project_id: string;
  task_title: string;
  task_details?: string;
  status: string;
  planned_start?: string;
  planned_end?: string;
  actual_start?: string;
  actual_end?: string;
  assignee?: string;
  step_name: string;
  project?: {
    name: string;
    domain: string;
    company?: {
      name: string;
    };
  };
}

interface TaskListProps {
  tasks: Task[];
  filterBySearch: (text: string) => boolean;
  filterByDateRange: (date: string | undefined) => boolean;
  setSelectedTask: (task: Task) => void;
  setIsTaskDialogOpen: (open: boolean) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'closed':
    case 'complete':
    case 'done':
      return 'bg-green-100 text-green-800';
    case 'in progress':
    case 'open':
    case 'active':
      return 'bg-blue-100 text-blue-800';
    case 'blocked':
    case 'on hold':
      return 'bg-red-100 text-red-800';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const TaskCard = ({ task, setSelectedTask, setIsTaskDialogOpen }: {
  task: Task;
  setSelectedTask: (task: Task) => void;
  setIsTaskDialogOpen: (open: boolean) => void;
}) => {
  const statusResult = useTaskStatus({
    planned_start: task.planned_start,
    planned_end: task.planned_end,
    actual_start: task.actual_start,
    actual_end: task.actual_end
  });

  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      statusResult.color === 'destructive' && "border-red-200 bg-red-50"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{task.task_title}</h3>
              <Badge className={getStatusColor(task.status)}>{task.status}</Badge>
              <Badge 
                variant={statusResult.color === 'success' || statusResult.color === 'warning' ? 'default' : statusResult.color} 
                className={statusResult.bgColor}
              >
                {statusResult.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{task.task_details}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Customer: {task.project?.company?.name || 'N/A'}</span>
              <span>Project: {task.project?.name}</span>
              <span>Step: {task.step_name}</span>
              {task.planned_start && <span>Start: {format(parseISO(task.planned_start), 'MMM dd')}</span>}
              {task.planned_end && <span>Due: {format(parseISO(task.planned_end), 'MMM dd')}</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setSelectedTask(task);
            setIsTaskDialogOpen(true);
          }}>
            View Task
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const TaskList = ({ 
  tasks, 
  filterBySearch, 
  filterByDateRange, 
  setSelectedTask, 
  setIsTaskDialogOpen 
}: TaskListProps) => {
  return (
    <div className="space-y-4">
      {tasks
        .filter(task => filterBySearch(task.task_title + ' ' + (task.task_details || '')))
        .filter(task => filterByDateRange(task.planned_start) || filterByDateRange(task.planned_end))
        .map((task) => (
          <TaskCard 
            key={task.id}
            task={task}
            setSelectedTask={setSelectedTask}
            setIsTaskDialogOpen={setIsTaskDialogOpen}
          />
        ))}
    </div>
  );
};

export default TaskList;