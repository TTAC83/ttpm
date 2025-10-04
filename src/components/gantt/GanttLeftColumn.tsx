import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Plus, Trash2 } from 'lucide-react';

interface MasterTask {
  id: number;
  step_id: number;
  title: string;
  details: string | null;
  planned_start_offset_days: number;
  planned_end_offset_days: number;
  position: number;
  technology_scope: string;
  assigned_role: string | null;
  parent_task_id: number | null;
  level?: number;
}

interface GanttLeftColumnProps {
  tasks: MasterTask[];
  stepId: number;
  onEditTask: (task: MasterTask) => void;
  onAddTask: (stepId: number, parentTaskId?: number) => void;
  onDeleteTask: (taskId: number) => void;
}

const getTechScopeColor = (scope: string) => {
  switch (scope) {
    case 'iot': return 'bg-blue-500';
    case 'vision': return 'bg-green-500';
    case 'both': return 'bg-purple-500';
    default: return 'bg-gray-500';
  }
};

const getTechScopeLabel = (scope: string) => {
  switch (scope) {
    case 'iot': return 'IoT';
    case 'vision': return 'Vision';
    case 'both': return 'Both';
    default: return scope;
  }
};

export const GanttLeftColumn = ({ tasks, stepId, onEditTask, onAddTask, onDeleteTask }: GanttLeftColumnProps) => {
  return (
    <div className="w-96 flex-shrink-0 bg-background border-r border-border sticky left-0 z-10">
      {tasks.map(task => {
        const level = task.level || 0;
        const isSubtask = level > 0;
        
        return (
          <div key={task.id} className="border-b border-border/30 hover:bg-muted/20 group h-12">
            <div 
              className="flex items-center gap-2 p-3 h-full"
              style={{ paddingLeft: `${level * 24 + 12}px` }}
            >
              {isSubtask && (
                <div className="flex items-center mr-2">
                  <div className="w-4 h-0.5 bg-border"></div>
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 ml-1"></div>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm flex-1 truncate ${isSubtask ? 'text-muted-foreground' : ''}`}>
                    {task.title}
                  </span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs px-1.5 py-0 border-0 text-white flex-shrink-0 ${getTechScopeColor(task.technology_scope)}`}
                  >
                    {getTechScopeLabel(task.technology_scope)}
                  </Badge>
                </div>
              </div>
            
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!task.parent_task_id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onAddTask(stepId, task.id)}
                    title="Add subtask"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => onEditTask(task)}
                  title="Edit task"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  onClick={() => onDeleteTask(task.id)}
                  title="Delete task"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
