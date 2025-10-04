import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GanttScrollProvider } from './gantt/GanttScrollContext';
import { GanttHeader } from './gantt/GanttHeader';
import { GanttLeftColumn } from './gantt/GanttLeftColumn';
import { GanttTimeline } from './gantt/GanttTimeline';
import { BottomScrollbar } from './gantt/BottomScrollbar';

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
  const DAY_WIDTH = 32;
  const FROZEN_WIDTH = 384; // w-96
  
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

  return (
    <GanttScrollProvider>
      <div className="relative" style={{ height: 'calc(100vh - 24rem)' }}>
        <div 
          className="overflow-y-scroll force-scrollbars h-full pr-2"
          style={{ paddingBottom: '16px' }}
        >
          <div className="space-y-6">
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
                      <GanttHeader maxDays={ganttData.maxDays} dayWidth={DAY_WIDTH} />
                      
                      <div className="flex min-w-0">
                        <GanttLeftColumn 
                          tasks={step.tasks}
                          stepId={step.id}
                          onEditTask={onEditTask}
                          onAddTask={onAddTask}
                          onDeleteTask={onDeleteTask}
                        />
                        
                        <GanttTimeline 
                          tasks={step.tasks}
                          maxDays={ganttData.maxDays}
                          dayWidth={DAY_WIDTH}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        <BottomScrollbar 
          maxDays={ganttData.maxDays}
          dayWidth={DAY_WIDTH}
          frozenWidth={FROZEN_WIDTH}
        />
      </div>
    </GanttScrollProvider>
  );
};