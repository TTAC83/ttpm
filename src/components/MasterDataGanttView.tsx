import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Plus, Trash2 } from 'lucide-react';

interface MasterStep {
  id: number;
  name: string;
  position: number;
}

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
  subtasks?: MasterTask[];
  master_steps?: {
    name: string;
  };
}

interface MasterDataGanttViewProps {
  steps: MasterStep[];
  tasks: MasterTask[];
  onEditTask: (task: MasterTask) => void;
  onAddTask: (stepId: number, parentTaskId?: number) => void;
  onDeleteTask: (taskId: number) => void;
}

export const MasterDataGanttView = ({
  steps,
  tasks,
  onEditTask,
  onAddTask,
  onDeleteTask
}: MasterDataGanttViewProps) => {
  
  const ganttData = useMemo(() => {
    const maxDays = Math.max(
      ...tasks.map(task => task.planned_end_offset_days),
      30
    );
    
    return {
      steps: steps.map(step => ({
        ...step,
        rootTasks: tasks.filter(task => task.step_id === step.id && !task.parent_task_id)
      })),
      maxDays
    };
  }, [steps, tasks]);

  const getTechScopeColor = (scope: string) => {
    switch (scope) {
      case 'iot': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'vision': return 'bg-green-100 text-green-800 border-green-200';
      case 'both': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  const renderTaskBar = (task: MasterTask, level: number = 0) => {
    const duration = task.planned_end_offset_days - task.planned_start_offset_days;
    const leftPercent = (task.planned_start_offset_days / ganttData.maxDays) * 100;
    const widthPercent = (duration / ganttData.maxDays) * 100;

    return (
      <div key={task.id} className="mb-1">
        <div 
          className="flex items-center py-2 px-3 rounded hover:bg-muted/50 group"
          style={{ paddingLeft: `${level * 20 + 12}px` }}
        >
          {/* Task Info */}
          <div className="w-72 flex-shrink-0 flex items-center gap-2">
            <span className="font-medium text-sm">{task.title}</span>
            <Badge 
              variant="outline" 
              className={`text-xs px-2 py-0 ${getTechScopeColor(task.technology_scope)}`}
            >
              {getTechScopeLabel(task.technology_scope)}
            </Badge>
            {task.assigned_role && (
              <Badge variant="secondary" className="text-xs">
                {task.assigned_role.replace('_', ' ')}
              </Badge>
            )}
          </div>
          
          {/* Gantt Bar */}
          <div className="flex-1 relative h-6 bg-muted rounded mr-4">
            <div
              className={`absolute h-full rounded transition-all ${
                task.parent_task_id 
                  ? 'bg-orange-400 hover:bg-orange-500' 
                  : 'bg-primary hover:bg-primary/80'
              }`}
              style={{
                left: `${leftPercent}%`,
                width: `${Math.max(widthPercent, 2)}%`
              }}
              title={`Days ${task.planned_start_offset_days}-${task.planned_end_offset_days}`}
            />
          </div>
          
          {/* Actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!task.parent_task_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onAddTask(task.step_id, task.id)}
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
        
        {/* Render subtasks */}
        {task.subtasks?.map(subtask => renderTaskBar(subtask, level + 1))}
      </div>
    );
  };

  const renderTimeHeader = () => {
    const days = Array.from({ length: ganttData.maxDays + 1 }, (_, i) => i);
    
    return (
      <div className="flex items-center mb-4">
        <div className="w-72 flex-shrink-0 font-semibold text-sm">Tasks</div>
        <div className="flex-1 flex mr-4">
          {days.map(day => (
            <div
              key={day}
              className="flex-1 text-center text-xs text-muted-foreground border-l border-border first:border-l-0 py-1"
            >
              {day}d
            </div>
          ))}
        </div>
        <div className="w-24">Actions</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {ganttData.steps.map(step => (
        <Card key={step.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-primary">
                {step.name}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddTask(step.id)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {renderTimeHeader()}
            
            {step.rootTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks in this step. Click "Add Task" to get started.
              </div>
            ) : (
              <div className="space-y-1">
                {step.rootTasks.map(task => renderTaskBar(task))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};