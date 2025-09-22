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
    
    const stepsWithTasks = steps.map(step => {
      const rootTasks = tasks.filter(task => task.step_id === step.id && !task.parent_task_id);
      const allTasks: MasterTask[] = [];
      
      // Flatten tasks with subtasks for rendering
      const flattenTasks = (taskList: MasterTask[], level: number = 0) => {
        taskList.forEach(task => {
          allTasks.push({ ...task, level } as any);
          if (task.subtasks && task.subtasks.length > 0) {
            flattenTasks(task.subtasks, level + 1);
          }
        });
      };
      
      flattenTasks(rootTasks);
      
      return {
        ...step,
        tasks: allTasks
      };
    });
    
    return {
      steps: stepsWithTasks,
      maxDays
    };
  }, [steps, tasks]);

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

  return (
    <div className="space-y-6 h-full overflow-y-auto">
      {ganttData.steps.map(step => (
        <Card key={step.id} className="overflow-visible">
          <CardHeader className="pb-3 bg-muted/20">
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
          <CardContent className="p-0">
            {step.tasks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="mb-2">No tasks in this step</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onAddTask(step.id)}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add First Task
                </Button>
              </div>
            ) : (
              <div className="relative">
                {/* Header with frozen task column and scrollable timeline */}
                <div className="flex border-b-2 border-border bg-background">
                  <div className="w-80 flex-shrink-0 bg-muted/50 border-r border-border">
                    <div className="p-3 font-semibold text-sm">
                      Tasks & Timeline
                    </div>
                  </div>
                  <div className="flex-1 overflow-x-auto">
                    <div 
                      className="flex border-b bg-muted/30"
                      style={{ minWidth: `${(ganttData.maxDays + 1) * 40}px` }}
                    >
                      {Array.from({ length: ganttData.maxDays + 1 }, (_, i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 text-center text-xs font-medium py-2 border-r border-border/50"
                          style={{ width: '40px' }}
                        >
                          Day {i}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Task rows with coordinated horizontal scroll */}
                <div className="flex">
                  <div className="w-80 flex-shrink-0 bg-background border-r border-border">
                    {step.tasks.map(task => (
                      <div key={task.id} className="border-b border-border/30 hover:bg-muted/20 group">
                        <div 
                          className="flex items-center gap-2 p-3 h-12"
                          style={{ paddingLeft: `${((task as any).level || 0) * 20 + 12}px` }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm truncate">{task.title}</span>
                              <Badge 
                                variant="outline" 
                                className={`text-xs px-1.5 py-0 border-0 text-white ${getTechScopeColor(task.technology_scope)}`}
                              >
                                {getTechScopeLabel(task.technology_scope)}
                              </Badge>
                            </div>
                            {task.assigned_role && (
                              <Badge variant="secondary" className="text-xs">
                                {task.assigned_role.replace('_', ' ')}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {!task.parent_task_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => onAddTask(step.id, task.id)}
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
                    ))}
                  </div>
                  
                  {/* Scrollable timeline bars */}
                  <div className="flex-1 overflow-x-auto">
                    <div style={{ minWidth: `${(ganttData.maxDays + 1) * 40}px` }}>
                      {step.tasks.map(task => {
                        const duration = task.planned_end_offset_days - task.planned_start_offset_days;
                        const dayWidth = 40;
                        const leftOffset = task.planned_start_offset_days * dayWidth;
                        const barWidth = Math.max(duration * dayWidth, dayWidth * 0.5);

                        return (
                          <div key={task.id} className="relative h-12 border-b border-border/30 hover:bg-muted/20">
                            {/* Vertical day lines */}
                            {Array.from({ length: ganttData.maxDays + 1 }, (_, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 border-r border-border/20"
                                style={{ left: `${i * dayWidth}px` }}
                              />
                            ))}
                            
                            {/* Task bar */}
                            <div
                              className={`absolute top-2 bottom-2 rounded transition-all cursor-pointer ${
                                task.parent_task_id 
                                  ? 'bg-orange-400 hover:bg-orange-500' 
                                  : 'bg-primary hover:bg-primary/80'
                              }`}
                              style={{
                                left: `${leftOffset}px`,
                                width: `${barWidth}px`
                              }}
                              title={`${task.title}: Days ${task.planned_start_offset_days}-${task.planned_end_offset_days} (${duration} days)`}
                            >
                              <div className="px-2 py-1 text-xs font-medium text-white truncate">
                                {duration}d
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};