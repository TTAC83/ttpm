import { useMemo, useRef, useEffect, useState } from 'react';
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
  const timelineRefs = useRef<HTMLDivElement[]>([]);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScrollLeft, setMaxScrollLeft] = useState(0);

  // Vertical scroll management
  const verticalRef = useRef<HTMLDivElement | null>(null);
  const [vScrollTop, setVScrollTop] = useState(0);
  const [vMaxScrollTop, setVMaxScrollTop] = useState(0);
  
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

  // Sync scroll across all timeline elements
  const handleTimelineScroll = (scrollLeft: number) => {
    setScrollLeft(scrollLeft);
    timelineRefs.current.forEach(ref => {
      if (ref && ref.scrollLeft !== scrollLeft) {
        ref.scrollLeft = scrollLeft;
      }
    });
  };

  // Update max scroll when data changes
  useEffect(() => {
    if (timelineRefs.current[0]) {
      const maxScroll = timelineRefs.current[0].scrollWidth - timelineRefs.current[0].clientWidth;
      setMaxScrollLeft(Math.max(0, maxScroll));
    }
    if (verticalRef.current) {
      const maxV = verticalRef.current.scrollHeight - verticalRef.current.clientHeight;
      setVMaxScrollTop(Math.max(0, maxV));
    }
  }, [ganttData]);

  // Custom scrollbar for horizontal timeline (vertical slider)
  const HorizontalScrollbar = () => {
    const scrollbarRef = useRef<HTMLDivElement>(null);
    
    const handleScrollbarDrag = (e: React.MouseEvent) => {
      if (!scrollbarRef.current) return;
      
      const startY = e.clientY;
      const startScrollLeft = scrollLeft;
      
      const handleMouseMove = (e: MouseEvent) => {
        const deltaY = e.clientY - startY;
        const trackHeight = scrollbarRef.current?.clientHeight || 1;
        const scrollRatio = deltaY / trackHeight;
        const newScrollLeft = Math.max(0, Math.min(maxScrollLeft, startScrollLeft + scrollRatio * maxScrollLeft));
        handleTimelineScroll(newScrollLeft);
      };
      
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    };

    if (maxScrollLeft <= 0) return null;

    const trackHeight = 320;
    const thumbHeight = Math.max(24, (trackHeight * (timelineRefs.current[0]?.clientWidth || 0)) / (timelineRefs.current[0]?.scrollWidth || 1));
    const thumbTop = (scrollLeft / (maxScrollLeft || 1)) * (trackHeight - thumbHeight);

    return (
      <div className="fixed right-12 top-1/2 -translate-y-1/2 w-4 h-[320px] bg-muted/50 rounded-full border border-border z-[9998] shadow-lg backdrop-blur-sm">
        <div className="relative h-full p-0.5" ref={scrollbarRef}>
          <div
            className="absolute left-0.5 right-0.5 bg-primary/80 hover:bg-primary rounded-full cursor-pointer transition-colors shadow-sm"
            style={{ height: `${thumbHeight}px`, top: `${thumbTop}px` }}
            onMouseDown={handleScrollbarDrag}
            title={`Horizontal: ${Math.round((scrollLeft / (maxScrollLeft || 1)) * 100)}%`}
          />
        </div>
      </div>
    );
  };

  // Left-side native-like vertical scrollbar controlling the main container
  const LeftScrollbar = () => {
    const trackRef = useRef<HTMLDivElement>(null);

    const onDrag = (e: React.MouseEvent) => {
      e.preventDefault();
      const track = trackRef.current;
      const container = verticalRef.current;
      if (!track || !container) return;
      const startY = e.clientY;
      const startScrollTop = container.scrollTop;

      const move = (me: MouseEvent) => {
        const trackHeight = track.clientHeight;
        const visible = container.clientHeight;
        const content = container.scrollHeight;
        const maxScroll = Math.max(0, content - visible);
        const thumbH = Math.max(24, (visible / content) * trackHeight);
        const startThumbTopPx = (startScrollTop / (maxScroll || 1)) * (trackHeight - thumbH);
        const delta = me.clientY - startY;
        const newThumbTopPx = Math.max(0, Math.min(trackHeight - thumbH, startThumbTopPx + delta));
        const newScrollTop = (newThumbTopPx / (trackHeight - thumbH)) * (maxScroll || 1);
        container.scrollTop = newScrollTop;
        setVScrollTop(newScrollTop);
        setVMaxScrollTop(maxScroll);
      };

      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };

      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    };

    const container = verticalRef.current;
    const visible = container?.clientHeight || 0;
    const content = container?.scrollHeight || 0;
    const overflow = content > visible && visible > 0;
    if (!overflow) return null;

    const trackHeight = visible; // match container height
    const maxScroll = Math.max(0, content - visible);
    const thumbHeight = Math.max(24, (visible / content) * trackHeight);
    const thumbTop = (vScrollTop / (maxScroll || 1)) * (trackHeight - thumbHeight);

    return (
      <div className="absolute left-0 top-0 bottom-0 w-3 z-[60] select-none">
        <div ref={trackRef} className="relative h-full bg-muted/40 border-r border-border">
          <div
            className="absolute left-0 right-0 bg-foreground/70 hover:bg-foreground rounded-r cursor-pointer"
            style={{ height: `${thumbHeight}px`, top: `${thumbTop}px` }}
            onMouseDown={onDrag}
            title={`Vertical: ${Math.round((vScrollTop / (maxScroll || 1)) * 100)}%`}
          />
        </div>
      </div>
    );
  };

  const onVerticalContainerScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setVScrollTop(el.scrollTop);
    setVMaxScrollTop(Math.max(0, el.scrollHeight - el.clientHeight));
  };

  const handleVerticalScroll = (newTop: number) => {
    setVScrollTop(newTop);
    if (verticalRef.current && verticalRef.current.scrollTop !== newTop) {
      verticalRef.current.scrollTop = newTop;
    }
  };
  return (
    <div className="relative" style={{ height: 'calc(100vh - 24rem)' }}>
      {/* Main scrollable content */}
      <div 
        ref={verticalRef}
        onScroll={onVerticalContainerScroll}
        className="h-full overflow-y-auto space-y-6 pr-6"
      >
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
                  <div 
                    className="flex-1 overflow-x-auto"
                    ref={(el) => {
                      if (el) timelineRefs.current[0] = el;
                    }}
                    onScroll={(e) => handleTimelineScroll(e.currentTarget.scrollLeft)}
                  >
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
                    {step.tasks.map(task => {
                      const level = (task as any).level || 0;
                      const isSubtask = level > 0;
                      
                      return (
                        <div key={task.id} className="border-b border-border/30 hover:bg-muted/20 group">
                          <div 
                            className="flex items-center gap-2 p-3 h-12"
                            style={{ paddingLeft: `${level * 24 + 12}px` }}
                          >
                            {/* Hierarchy indicator */}
                            {isSubtask && (
                              <div className="flex items-center mr-2">
                                <div className="w-4 h-0.5 bg-border"></div>
                                <div className="w-2 h-2 rounded-full bg-muted-foreground/40 ml-1"></div>
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`font-medium text-sm truncate ${isSubtask ? 'text-muted-foreground' : ''}`}>
                                  {task.title}
                                </span>
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
                      );
                    })}
                  </div>
                  
                  {/* Scrollable timeline bars */}
                  <div 
                    className="flex-1 overflow-x-auto"
                    ref={(el) => {
                      if (el) timelineRefs.current[ganttData.steps.findIndex(s => s.id === step.id) + 1] = el;
                    }}
                    onScroll={(e) => handleTimelineScroll(e.currentTarget.scrollLeft)}
                  >
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
      <LeftScrollbar />
      <HorizontalScrollbar />
    </div>
  );
};