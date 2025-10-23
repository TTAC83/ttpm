import { useMemo, useRef, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Edit, Plus, Trash2, Link2, ChevronRight, ChevronDown, ChevronsRight, ChevronsDown } from 'lucide-react';
import { wbsService } from '@/lib/wbsService';
import { toast } from 'sonner';
import { TaskEditSidebar } from './TaskEditSidebar';

interface MasterStep {
  id: number;
  name: string;
  position: number;
  planned_start_offset_days?: number | null;
  planned_end_offset_days?: number | null;
}

interface MasterTask {
  id: number;
  step_id: number;
  title: string;
  details: string | null;
  planned_start_offset_days: number;
  planned_end_offset_days: number;
  duration_days: number;
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
  onOpenDependencies?: (type: 'step' | 'task' | 'subtask', id: number, name: string) => void;
  onRefresh?: () => void;
}

export const MasterDataGanttView = ({
  steps,
  tasks,
  onEditTask,
  onAddTask,
  onDeleteTask,
  onOpenDependencies,
  onRefresh
}: MasterDataGanttViewProps) => {
  const timelineRefs = useRef<HTMLDivElement[]>([]);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [maxScrollLeft, setMaxScrollLeft] = useState(0);

  // Vertical scroll management
  const verticalRef = useRef<HTMLDivElement | null>(null);
  const [vScrollTop, setVScrollTop] = useState(0);
  const [vMaxScrollTop, setVMaxScrollTop] = useState(0);
  
  // Dependencies
  const [dependencies, setDependencies] = useState<any[]>([]);
  const [hoveredDependency, setHoveredDependency] = useState<string | null>(null);
  const [selectedDependencyForDelete, setSelectedDependencyForDelete] = useState<{
    id: string;
    fromName: string;
    toName: string;
    type: string;
  } | null>(null);

  // Drag states
  const [dragState, setDragState] = useState<{
    type: 'none' | 'task' | 'dependency';
    taskId?: number;
    taskType?: 'task' | 'subtask';
    stepId?: number;
    startX: number;
    currentX: number;
    currentY: number;
    originalStartDays?: number;
    originalEndDays?: number;
    dependencyFrom?: { type: 'task' | 'subtask'; id: number; edge: 'left' | 'right'; name: string };
  }>({
    type: 'none',
    startX: 0,
    currentX: 0,
    currentY: 0,
  });

  // Dependency creation dialog
  const [dependencyDialog, setDependencyDialog] = useState<{
    open: boolean;
    from?: { type: 'task' | 'subtask'; id: number; name: string };
    to?: { type: 'task' | 'subtask'; id: number; name: string };
  }>({ open: false });

  // Edit sidebar state
  const [editSidebar, setEditSidebar] = useState<{
    open: boolean;
    task: MasterTask | null;
    type: 'task' | 'subtask';
  }>({ open: false, task: null, type: 'task' });
  const [dependencyType, setDependencyType] = useState<'FS' | 'SS' | 'FF' | 'SF'>('FS');
  const [lagDays, setLagDays] = useState(0);

  // Collapse state management
  const [collapseState, setCollapseState] = useState<{
    steps: Set<number>;      // collapsed step IDs
    tasks: Set<number>;      // collapsed task IDs
    globalLevel: 'all' | 'steps-tasks' | 'steps-only';
  }>({
    steps: new Set(),
    tasks: new Set(),
    globalLevel: 'all'
  });

  useEffect(() => {
    loadDependencies();
  }, [steps, tasks]);

  const loadDependencies = async () => {
    try {
      const deps = await wbsService.getAllDependencies();
      setDependencies(deps);
    } catch (error) {
      console.error('Error loading dependencies:', error);
    }
  };

  // Collapse helper functions
  const isStepExpanded = (stepId: number): boolean => {
    if (collapseState.globalLevel === 'steps-only') return false;
    return !collapseState.steps.has(stepId);
  };

  const isTaskExpanded = (taskId: number): boolean => {
    if (collapseState.globalLevel !== 'all') return false;
    return !collapseState.tasks.has(taskId);
  };

  const toggleStep = (stepId: number) => {
    setCollapseState(prev => {
      const newSteps = new Set(prev.steps);
      if (newSteps.has(stepId)) {
        newSteps.delete(stepId);
      } else {
        newSteps.add(stepId);
      }
      return { ...prev, steps: newSteps, globalLevel: 'all' };
    });
  };

  const toggleTask = (taskId: number) => {
    setCollapseState(prev => {
      const newTasks = new Set(prev.tasks);
      if (newTasks.has(taskId)) {
        newTasks.delete(taskId);
      } else {
        newTasks.add(taskId);
      }
      return { ...prev, tasks: newTasks, globalLevel: 'all' };
    });
  };

  const setGlobalLevel = (level: 'all' | 'steps-tasks' | 'steps-only') => {
    setCollapseState(prev => ({ ...prev, globalLevel: level }));
  };
  
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

  // Helper function to find any task by ID (including nested subtasks)
  const findTaskById = (taskId: number): MasterTask | null => {
    const searchInTasks = (taskList: MasterTask[]): MasterTask | null => {
      for (const task of taskList) {
        if (task.id === taskId) return task;
        if (task.subtasks) {
          const found = searchInTasks(task.subtasks);
          if (found) return found;
        }
      }
      return null;
    };
    return searchInTasks(tasks);
  };

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

  // Handle task drag to adjust dates
  const handleTaskBarMouseDown = (
    e: React.MouseEvent,
    task: MasterTask,
    stepId: number
  ) => {
    e.stopPropagation();
    const dayWidth = 32;
    setDragState({
      type: 'task',
      taskId: task.id,
      taskType: task.parent_task_id ? 'subtask' : 'task',
      stepId,
      startX: e.clientX,
      currentX: e.clientX,
      currentY: e.clientY,
      originalStartDays: task.planned_start_offset_days,
      originalEndDays: task.planned_end_offset_days,
    });
  };

  // Handle dependency drag handle mousedown
  const handleDependencyHandleMouseDown = (
    e: React.MouseEvent,
    task: MasterTask,
    edge: 'left' | 'right'
  ) => {
    e.stopPropagation();
    const itemType = task.parent_task_id ? 'subtask' : 'task';
    setDragState({
      type: 'dependency',
      startX: e.clientX,
      currentX: e.clientX,
      currentY: e.clientY,
      dependencyFrom: { type: itemType, id: task.id, edge, name: task.title },
    });
  };

  // Global mouse move handler
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (dragState.type === 'none') return;
      
      setDragState(prev => ({
        ...prev,
        currentX: e.clientX,
        currentY: e.clientY,
      }));
    };

    const handleMouseUp = async (e: MouseEvent) => {
      if (dragState.type === 'task' && dragState.taskId !== undefined) {
        // Finalize task date adjustment
        const dayWidth = 32;
        const deltaX = e.clientX - dragState.startX;
        const offsetDays = Math.round(deltaX / dayWidth);
        
        if (offsetDays !== 0) {
          const newStart = (dragState.originalStartDays ?? 0) + offsetDays;
          const newEnd = (dragState.originalEndDays ?? 0) + offsetDays;
          
          if (newStart >= 0) {
            try {
              // Find the task being moved
              const movedTask = findTaskById(dragState.taskId);
              
              // Update the parent task first
              await wbsService.updateMasterTask(dragState.taskId, {
                planned_start_offset_days: newStart,
                planned_end_offset_days: newEnd,
              });
              
              // If this is a parent task (not a subtask), also move all its subtasks
              if (movedTask && !movedTask.parent_task_id && movedTask.subtasks && movedTask.subtasks.length > 0) {
                // Move each subtask by the same offset
                for (const subtask of movedTask.subtasks) {
                  const subtaskNewStart = subtask.planned_start_offset_days + offsetDays;
                  const subtaskNewEnd = subtask.planned_end_offset_days + offsetDays;
                  
                  // Ensure subtask stays within parent task's new range
                  const constrainedStart = Math.max(newStart, subtaskNewStart);
                  const constrainedEnd = Math.min(newEnd, subtaskNewEnd);
                  
                  await wbsService.updateMasterTask(subtask.id, {
                    planned_start_offset_days: constrainedStart,
                    planned_end_offset_days: constrainedEnd,
                  });
                }
                toast.success(`Task and ${movedTask.subtasks.length} subtask(s) moved: Day ${newStart} to ${newEnd}`);
              } else {
                toast.success(`Task dates updated: Day ${newStart} to ${newEnd}`);
              }
              
              // Refresh data to reflect changes
              onRefresh?.();
              await loadDependencies();
            } catch (error: any) {
              toast.error(`Failed to update task: ${error.message}`);
            }
          } else {
            toast.error('Cannot move task before day 0');
          }
        }
      } else if (dragState.type === 'dependency' && dragState.dependencyFrom) {
        // Check if we're over a valid task bar (drop target)
        const targetElement = document.elementFromPoint(e.clientX, e.clientY);
        if (targetElement) {
          const barElement = targetElement.closest('[data-task-id]');
          if (barElement) {
            const targetTaskId = parseInt(barElement.getAttribute('data-task-id') || '0');
            const targetTaskType = barElement.getAttribute('data-task-type') as 'task' | 'subtask' | null;
            
            if (targetTaskId && targetTaskType && targetTaskId !== dragState.dependencyFrom.id) {
              // Find task name using the helper function
              const targetTask = findTaskById(targetTaskId);
              if (targetTask) {
                console.log('Dependency dialog opening:', {
                  from: dragState.dependencyFrom,
                  to: { type: targetTaskType, id: targetTaskId, name: targetTask.title }
                });
                setDependencyDialog({
                  open: true,
                  from: { 
                    type: dragState.dependencyFrom.type, 
                    id: dragState.dependencyFrom.id, 
                    name: dragState.dependencyFrom.name 
                  },
                  to: { type: targetTaskType, id: targetTaskId, name: targetTask.title },
                });
              } else {
                toast.error(`Could not find target task with ID ${targetTaskId}`);
              }
            } else if (targetTaskId === dragState.dependencyFrom.id) {
              toast.error('Cannot create dependency to the same task');
            }
          } else {
            toast.error('Please drop on a task bar to create a dependency');
          }
        }
      }
      
      setDragState({
        type: 'none',
        startX: 0,
        currentX: 0,
        currentY: 0,
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dragState.type !== 'none') {
        setDragState({
          type: 'none',
          startX: 0,
          currentX: 0,
          currentY: 0,
        });
      }
    };

    if (dragState.type !== 'none') {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.cursor = dragState.type === 'task' ? 'grabbing' : 'crosshair';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragState, tasks]);

  // Create dependency from dialog
  const handleCreateDependency = async () => {
    if (!dependencyDialog.from || !dependencyDialog.to) {
      toast.error('Missing dependency information');
      return;
    }
    
    const { from, to } = dependencyDialog;
    
    // Determine predecessor/successor based on edge clicked
    let predecessorType = from.type;
    let predecessorId = from.id;
    let successorType = to.type;
    let successorId = to.id;
    
    try {
      console.log('Creating dependency:', {
        predecessorType,
        predecessorId,
        successorType,
        successorId,
        dependencyType,
        lagDays
      });
      
      await wbsService.createDependency(
        predecessorType,
        predecessorId,
        successorType,
        successorId,
        dependencyType,
        lagDays
      );
      toast.success(`Dependency created: ${from.name} → ${to.name}`);
      
      // Refresh data to show new dependency
      onRefresh?.();
      await loadDependencies();
      
      setDependencyDialog({ open: false });
      setDependencyType('FS');
      setLagDays(0);
    } catch (error: any) {
      console.error('Failed to create dependency:', error);
      toast.error(`Failed to create dependency: ${error.message}`);
    }
  };

  // Delete dependency
  const handleDeleteDependency = async () => {
    if (!selectedDependencyForDelete) return;
    
    try {
      await wbsService.deleteDependency(selectedDependencyForDelete.id);
      toast.success(`Dependency deleted: ${selectedDependencyForDelete.fromName} → ${selectedDependencyForDelete.toName}`);
      
      // Refresh data
      onRefresh?.();
      await loadDependencies();
      
      setSelectedDependencyForDelete(null);
    } catch (error: any) {
      console.error('Failed to delete dependency:', error);
      toast.error(`Failed to delete dependency: ${error.message}`);
    }
  };

  return (
    <div className="relative" style={{ height: 'calc(100vh - 24rem)' }}>
      {/* Collapse Controls Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-background border-b border-border p-2 flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground mr-2">View:</span>
        <Button
          variant={collapseState.globalLevel === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGlobalLevel('all')}
          className="gap-2"
        >
          <ChevronsDown className="h-4 w-4" />
          All Details
        </Button>
        <Button
          variant={collapseState.globalLevel === 'steps-tasks' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGlobalLevel('steps-tasks')}
          className="gap-2"
        >
          <ChevronDown className="h-4 w-4" />
          Steps + Tasks
        </Button>
        <Button
          variant={collapseState.globalLevel === 'steps-only' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setGlobalLevel('steps-only')}
          className="gap-2"
        >
          <ChevronRight className="h-4 w-4" />
          Steps Only
        </Button>
      </div>

      {/* Main scrollable content */}
      <div 
        ref={verticalRef}
        onScroll={onVerticalContainerScroll}
        className="h-full overflow-y-auto pl-6 pt-14"
        style={{ direction: 'rtl', scrollbarGutter: 'stable both-edges' }}
      >
        <div className="space-y-6" style={{ direction: 'ltr' }}>
          {ganttData.steps.map(step => (
            <Card key={step.id} className="overflow-visible">
          <CardHeader className="pb-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Step collapse toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleStep(step.id)}
                  className="h-6 w-6 p-0"
                  disabled={collapseState.globalLevel === 'steps-only'}
                >
                  {isStepExpanded(step.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
                <CardTitle className="text-lg font-semibold text-primary">
                  {step.name}
                </CardTitle>
                {step.planned_start_offset_days !== null && step.planned_end_offset_days !== null && (
                  <Badge variant="secondary" className="text-xs font-normal">
                    Days {step.planned_start_offset_days}-{step.planned_end_offset_days}
                    <span className="ml-1 text-muted-foreground">
                      ({step.planned_end_offset_days - step.planned_start_offset_days + 1} days)
                    </span>
                  </Badge>
                )}
                {(step.planned_start_offset_days === null || step.planned_end_offset_days === null) && (
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    No dates calculated
                  </Badge>
                )}
              </div>
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
            {!isStepExpanded(step.id) ? null : step.tasks.length === 0 ? (
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
                  <div className="w-96 flex-shrink-0 bg-muted/50 border-r border-border">
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
                      style={{ minWidth: `${(ganttData.maxDays + 1) * 32}px` }}
                    >
                      {Array.from({ length: ganttData.maxDays + 1 }, (_, i) => (
                        <div
                          key={i}
                          className="flex-shrink-0 text-center text-xs font-medium py-2 border-r border-border/50"
                          style={{ width: '32px' }}
                        >
                          {i}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Task rows with coordinated horizontal scroll */}
                <div className="flex">
                  <div className="w-96 flex-shrink-0 bg-background border-r border-border">
                    {step.tasks.map(task => {
                      const level = (task as any).level || 0;
                      const isSubtask = level > 0;
                      const isParentTask = !isSubtask && task.subtasks && task.subtasks.length > 0;
                      
                      // Skip rendering if hidden by collapse state
                      if (isSubtask && collapseState.globalLevel !== 'all') return null;
                      if (isSubtask && task.parent_task_id && !isTaskExpanded(task.parent_task_id)) return null;
                      
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
                            
                            {/* Task collapse toggle for parent tasks */}
                            {isParentTask && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleTask(task.id)}
                                className="h-5 w-5 p-0 mr-1"
                                disabled={collapseState.globalLevel !== 'all'}
                              >
                                {isTaskExpanded(task.id) ? (
                                  <ChevronDown className="h-3 w-3" />
                                ) : (
                                  <ChevronRight className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`font-medium text-sm flex-1 ${isSubtask ? 'text-muted-foreground' : ''}`}>
                                  {task.title}
                                </span>
                                {isParentTask && (
                                  <Badge variant="secondary" className="text-xs px-1.5 py-0">
                                    🔄 Auto
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline" 
                                  className={`text-xs px-1.5 py-0 border-0 text-white flex-shrink-0 ${getTechScopeColor(task.technology_scope)}`}
                                >
                                  {getTechScopeLabel(task.technology_scope)}
                                </Badge>
                              </div>
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
                    <div style={{ minWidth: `${(ganttData.maxDays + 1) * 32}px` }}>
                        {step.tasks.map(task => {
                        const level = (task as any).level || 0;
                        const isSubtask = level > 0;
                        
                        // Skip rendering if hidden by collapse state
                        if (isSubtask && collapseState.globalLevel !== 'all') return null;
                        if (isSubtask && task.parent_task_id && !isTaskExpanded(task.parent_task_id)) return null;
                        
                        const dayWidth = 32;
                        const itemType = task.parent_task_id ? 'subtask' : 'task';
                        const leftOffset = task.planned_start_offset_days * dayWidth;
                        const durationDays = Math.max(
                          task.duration_days ?? (task.planned_end_offset_days - task.planned_start_offset_days),
                          1
                        );
                        const barWidth = durationDays * dayWidth;

                        return (
                          <div key={task.id} className="relative border-b border-border/30 hover:bg-muted/20 h-12">
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
                              id={`gantt-bar-${task.parent_task_id ? 'subtask' : 'task'}-${task.id}`}
                              data-task-id={task.id}
                              data-task-type={task.parent_task_id ? 'subtask' : 'task'}
                              className={`absolute top-2 bottom-2 rounded transition-all group/bar ${
                                task.parent_task_id 
                                  ? 'bg-orange-400 hover:bg-orange-500' 
                                  : 'bg-primary hover:bg-primary/80'
                              } ${dragState.type === 'task' && dragState.taskId === task.id ? 'opacity-70 shadow-lg' : ''}`}
                              style={{
                                left: dragState.type === 'task' && dragState.taskId === task.id
                                  ? `${(dragState.originalStartDays ?? 0) * 32 + Math.round((dragState.currentX - dragState.startX) / 32) * 32}px`
                                  : `${leftOffset}px`,
                                width: `${barWidth}px`,
                                cursor: dragState.type === 'none' ? 'grab' : dragState.type === 'task' && dragState.taskId === task.id ? 'grabbing' : 'default',
                                transition: dragState.type === 'task' && dragState.taskId === task.id ? 'none' : 'all 150ms ease',
                              }}
                              title={`${task.title}: Days ${task.planned_start_offset_days}-${task.planned_end_offset_days} (${durationDays} days)\nDrag to move • Drag handles to link • Double-click to edit`}
                              onMouseDown={(e) => handleTaskBarMouseDown(e, task, step.id)}
                              onDoubleClick={() => setEditSidebar({ open: true, task, type: itemType })}
                            >
                              {/* Dependency handles */}
                              <div
                                className="absolute left-0 top-0 bottom-0 w-3 bg-white/30 rounded-l cursor-pointer opacity-0 group-hover/bar:opacity-100 hover:bg-white/60 transition-all z-10 flex items-center justify-center"
                                onMouseDown={(e) => handleDependencyHandleMouseDown(e, task, 'left')}
                                title="Drag from here to create dependency (this task as predecessor)"
                              >
                                <Link2 className="w-3 h-3 text-white" />
                              </div>
                              <div
                                className="absolute right-0 top-0 bottom-0 w-3 bg-white/30 rounded-r cursor-pointer opacity-0 group-hover/bar:opacity-100 hover:bg-white/60 transition-all z-10 flex items-center justify-center"
                                onMouseDown={(e) => handleDependencyHandleMouseDown(e, task, 'right')}
                                title="Drag from here to create dependency (this task as successor)"
                              >
                                <Link2 className="w-3 h-3 text-white" />
                              </div>
                              
                              <div className="px-2 py-1 text-xs font-medium text-white truncate pointer-events-none">
                                {durationDays}d
                                {dragState.type === 'task' && dragState.taskId === task.id && (
                                  <span className="ml-1">
                                    → Day {(dragState.originalStartDays ?? 0) + Math.round((dragState.currentX - dragState.startX) / 32)}
                                  </span>
                                )}
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
      </div>
      <HorizontalScrollbar />
      
      {/* Dependency Arrows SVG Overlay */}
      {dependencies.length > 0 && (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-40 pointer-events-none">
          <svg className="w-full h-full">
            <defs>
              <marker
                id="dependency-arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" fillOpacity="0.6" />
              </marker>
              <marker
                id="dependency-arrowhead-hover"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--destructive))" fillOpacity="0.9" />
              </marker>
            </defs>
            {dependencies.map((dep) => {
              // Check if both source and target tasks are visible based on collapse state
              const predTask = findTaskById(dep.predecessor_id);
              const succTask = findTaskById(dep.successor_id);
              
              if (!predTask || !succTask) return null;
              
              // Check collapse visibility
              const isPredSubtask = predTask.parent_task_id !== null;
              const isSuccSubtask = succTask.parent_task_id !== null;
              
              // Hide if subtasks are collapsed globally
              if (isPredSubtask && collapseState.globalLevel !== 'all') return null;
              if (isSuccSubtask && collapseState.globalLevel !== 'all') return null;
              
              // Hide if parent task is collapsed
              if (isPredSubtask && predTask.parent_task_id && !isTaskExpanded(predTask.parent_task_id)) return null;
              if (isSuccSubtask && succTask.parent_task_id && !isTaskExpanded(succTask.parent_task_id)) return null;
              
              // Hide if step is collapsed
              if (!isStepExpanded(predTask.step_id) || !isStepExpanded(succTask.step_id)) return null;
              
              // Find predecessor and successor bars
              const predEl = document.getElementById(`gantt-bar-${dep.predecessor_type}-${dep.predecessor_id}`);
              const succEl = document.getElementById(`gantt-bar-${dep.successor_type}-${dep.successor_id}`);
              
              if (!predEl || !succEl) return null;
              
              const predRect = predEl.getBoundingClientRect();
              const succRect = succEl.getBoundingClientRect();
              const containerRect = verticalRef.current?.getBoundingClientRect();
              
              if (!containerRect) return null;
              
              // Calculate positions relative to container
              let x1, y1, x2, y2;
              
              switch (dep.dependency_type) {
                case 'FS': // Finish-to-Start
                  x1 = predRect.right - containerRect.left;
                  y1 = predRect.top + predRect.height / 2 - containerRect.top;
                  x2 = succRect.left - containerRect.left;
                  y2 = succRect.top + succRect.height / 2 - containerRect.top;
                  break;
                case 'SS': // Start-to-Start
                  x1 = predRect.left - containerRect.left;
                  y1 = predRect.top + predRect.height / 2 - containerRect.top;
                  x2 = succRect.left - containerRect.left;
                  y2 = succRect.top + succRect.height / 2 - containerRect.top;
                  break;
                case 'FF': // Finish-to-Finish
                  x1 = predRect.right - containerRect.left;
                  y1 = predRect.top + predRect.height / 2 - containerRect.top;
                  x2 = succRect.right - containerRect.left;
                  y2 = succRect.top + succRect.height / 2 - containerRect.top;
                  break;
                case 'SF': // Start-to-Finish
                  x1 = predRect.left - containerRect.left;
                  y1 = predRect.top + predRect.height / 2 - containerRect.top;
                  x2 = succRect.right - containerRect.left;
                  y2 = succRect.top + succRect.height / 2 - containerRect.top;
                  break;
                default:
                  return null;
              }
              
              const midX = (x1 + x2) / 2;
              const isHovered = hoveredDependency === dep.id;

              return (
                <g key={dep.id}>
                  {/* Invisible wider path for easier clicking - only when not dragging */}
                  {dragState.type !== 'dependency' && (
                    <path
                      d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                      stroke="transparent"
                      strokeWidth="12"
                      fill="none"
                      className="pointer-events-auto"
                      style={{ 
                        cursor: 'pointer'
                      }}
                      onMouseEnter={() => setHoveredDependency(dep.id)}
                      onMouseLeave={() => setHoveredDependency(null)}
                      onClick={() => {
                        if (predTask && succTask) {
                          setSelectedDependencyForDelete({
                            id: dep.id,
                            fromName: predTask.title,
                            toName: succTask.title,
                            type: dep.dependency_type
                          });
                        }
                      }}
                    />
                  )}
                  
                  {/* Visible dependency line */}
                  <path
                    d={`M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`}
                    stroke={isHovered ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                    strokeWidth={isHovered ? "3" : "2"}
                    fill="none"
                    strokeOpacity={isHovered ? "0.9" : "0.6"}
                    markerEnd={isHovered ? "url(#dependency-arrowhead-hover)" : "url(#dependency-arrowhead)"}
                    className="pointer-events-none"
                    style={{ 
                      transition: 'all 150ms ease'
                    }}
                  >
                    <title>
                      {predTask?.title} → {succTask?.title}
                      {'\n'}Type: {dep.dependency_type}
                      {dep.lag_days ? `\nLag: ${dep.lag_days} days` : ''}
                      {'\n\nClick to delete'}
                    </title>
                  </path>
                  
                  {/* Delete button on hover - only when not dragging */}
                  {isHovered && dragState.type !== 'dependency' && (
                    <g
                      className="pointer-events-auto"
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (predTask && succTask) {
                          setSelectedDependencyForDelete({
                            id: dep.id,
                            fromName: predTask.title,
                            toName: succTask.title,
                            type: dep.dependency_type
                          });
                        }
                      }}
                    >
                      <circle
                        cx={midX}
                        cy={(y1 + y2) / 2}
                        r="14"
                        fill="hsl(var(--destructive))"
                      />
                      <text
                        x={midX}
                        y={(y1 + y2) / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize="18"
                        fontWeight="bold"
                        style={{ pointerEvents: 'none' }}
                      >
                        ×
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
      
      {/* Dependency drag line overlay */}
      {dragState.type === 'dependency' && dragState.dependencyFrom && verticalRef.current && (
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-50">
          <svg className="w-full h-full">
            <defs>
              <marker
                id="dependency-drag-arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" fill="hsl(var(--primary))" fillOpacity="0.8" />
              </marker>
            </defs>
            {(() => {
              const sourceEl = document.getElementById(`gantt-bar-${dragState.dependencyFrom.type}-${dragState.dependencyFrom.id}`);
              if (!sourceEl) return null;
              
              const sourceRect = sourceEl.getBoundingClientRect();
              const containerRect = verticalRef.current?.getBoundingClientRect();
              if (!containerRect) return null;
              
              const x1 = dragState.dependencyFrom.edge === 'right'
                ? sourceRect.right - containerRect.left
                : sourceRect.left - containerRect.left;
              const y1 = sourceRect.top + sourceRect.height / 2 - containerRect.top;
              const x2 = dragState.currentX - containerRect.left;
              const y2 = dragState.currentY - containerRect.top;
              
              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(var(--primary))"
                  strokeWidth="3"
                  strokeOpacity="0.8"
                  strokeDasharray="5,5"
                  markerEnd="url(#dependency-drag-arrowhead)"
                />
              );
            })()}
          </svg>
        </div>
      )}

      {/* Dependency creation dialog */}
      <Dialog open={dependencyDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDependencyDialog({ open: false });
          setDependencyType('FS');
          setLagDays(0);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Dependency</DialogTitle>
          </DialogHeader>
          {dependencyDialog.from && dependencyDialog.to && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">From (Predecessor):</div>
                <div className="text-sm text-muted-foreground">{dependencyDialog.from.name}</div>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium mb-1">To (Successor):</div>
                <div className="text-sm text-muted-foreground">{dependencyDialog.to.name}</div>
              </div>
              <div className="space-y-2">
                <Label>Dependency Type</Label>
                <Select value={dependencyType} onValueChange={(v) => setDependencyType(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FS">Finish-to-Start (FS)</SelectItem>
                    <SelectItem value="SS">Start-to-Start (SS)</SelectItem>
                    <SelectItem value="FF">Finish-to-Finish (FF)</SelectItem>
                    <SelectItem value="SF">Start-to-Finish (SF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lag Days</Label>
                <Input
                  type="number"
                  value={lagDays}
                  onChange={(e) => setLagDays(parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDependencyDialog({ open: false });
              setDependencyType('FS');
              setLagDays(0);
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateDependency}>
              Create Dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete dependency confirmation dialog */}
      <Dialog open={!!selectedDependencyForDelete} onOpenChange={(open) => {
        if (!open) setSelectedDependencyForDelete(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Dependency</DialogTitle>
          </DialogHeader>
          {selectedDependencyForDelete && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this dependency?
              </p>
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="text-sm">
                  <span className="font-medium">From:</span> {selectedDependencyForDelete.fromName}
                </div>
                <div className="text-sm">
                  <span className="font-medium">To:</span> {selectedDependencyForDelete.toName}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Type:</span> {selectedDependencyForDelete.type}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedDependencyForDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteDependency}>
              Delete Dependency
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Sidebar */}
      <TaskEditSidebar
        open={editSidebar.open}
        onOpenChange={(open) => setEditSidebar({ ...editSidebar, open })}
        task={editSidebar.task}
        type={editSidebar.type}
        onSave={async (taskId, updates) => {
          try {
            await wbsService.updateMasterTask(taskId, updates);
            toast.success(`${editSidebar.type === 'task' ? 'Task' : 'Subtask'} updated successfully`);
            onRefresh?.();
            await loadDependencies();
          } catch (error) {
            console.error('Failed to update task:', error);
            toast.error(`Failed to update ${editSidebar.type}`);
          }
        }}
      />
    </div>
  );
};