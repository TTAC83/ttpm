import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Maximize2, FileDown, Eye, ChevronDown, ChevronRight, Expand, Minimize } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { formatDateUK } from '@/lib/dateUtils';
import { wbsService, type MasterStep, type MasterTask } from '@/lib/wbsService';
import { useToast } from '@/hooks/use-toast';
import { BarChart } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { TaskEditDialog } from '@/components/TaskEditDialog';
import { SubtaskEditSidebar } from '@/components/SubtaskEditSidebar';

interface WBSGanttChartProps {
  projectId?: string;
}

interface TaskWithDates {
  id: string;
  title: string;
  step_name: string;
  planned_start: string | null;
  planned_end: string | null;
  duration_days: number | null;
  is_milestone: boolean;
  subtasks?: TaskWithDates[];
  level: number; // 0=step, 1=task, 2=subtask, etc.
  parent_id?: string;
}

interface StepGroup {
  step_name: string;
  tasks: TaskWithDates[];
  planned_start: string | null;
  planned_end: string | null;
  step_order: number;
  aggregated_start?: string | null;
  aggregated_end?: string | null;
  level: number; // Always 0 for steps
  id: string;
}

interface CollapsibleState {
  [key: string]: boolean; // key = item id, value = is expanded
}

export function WBSGanttChart({ projectId }: WBSGanttChartProps) {
  const { toast } = useToast();
  const [steps, setSteps] = useState<MasterStep[]>([]);
  const [stepTasks, setStepTasks] = useState<Record<number, MasterTask[]>>({});
  const [loading, setLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [presentationMode, setPresentationMode] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf-full' | 'pdf-fit' | 'excel'>('pdf-full');
  const [isExporting, setIsExporting] = useState(false);
  const [collapsedItems, setCollapsedItems] = useState<CollapsibleState>({});
  const [expandAll, setExpandAll] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editingSubtask, setEditingSubtask] = useState<any>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadWBSData();
    loadProfiles();

    // Setup realtime subscription for subtasks changes
    const channel = supabase
      .channel(`wbs-gantt-${projectId || 'master'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subtasks'
        },
        (payload) => {
          console.log('Subtask changed in Gantt, reloading:', payload);
          loadWBSData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_tasks'
        },
        (payload) => {
          console.log('Project task changed in Gantt, reloading:', payload);
          loadWBSData();
        }
      )
      .subscribe();

    // Also listen for custom subtask-updated events
    const handleSubtaskUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('Subtask update event received in Gantt:', customEvent.detail);
      loadWBSData();
    };

    window.addEventListener('subtask-updated', handleSubtaskUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('subtask-updated', handleSubtaskUpdate);
    };
  }, [projectId]);

  const loadProfiles = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, name')
        .order('name');
      setProfiles(data || []);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  const loadWBSData = async () => {
    setLoading(true);
    try {
      let stepData: MasterStep[];
      const tasksData: Record<number, MasterTask[]> = {};

      if (projectId) {
        // Load project-specific data
        stepData = await wbsService.getProjectSteps(projectId);
        
        // Load actual project tasks with subtasks
        for (const step of stepData) {
          const { data: projectTasks } = await supabase
            .from('project_tasks')
            .select(`
              *,
              subtasks (
                *
              )
            `)
            .eq('project_id', projectId)
            .eq('master_task_id', step.id);
          
          // Convert project tasks to MasterTask-like objects (augmented with UUIDs)
          tasksData[step.id] = ((projectTasks || []).map((pt: any, idx: number) => ({
            // Use a numeric surrogate id to satisfy MasterTask typing, but keep the real UUID separately
            id: idx + 1,
            step_id: step.id,
            title: pt.task_title,
            details: pt.task_details || null,
            planned_start_offset_days: 0,
            planned_end_offset_days: 0,
            duration_days: 1,
            position: idx,
            technology_scope: 'both',
            assigned_role: '',
            parent_task_id: null,
            // Real identifiers and dates for project view
            project_task_uuid: pt.id,
            planned_start: pt.planned_start,
            planned_end: pt.planned_end,
            subtasks: (pt.subtasks || []).map((st: any, stIdx: number) => ({
              id: stIdx + 1,
              step_id: step.id,
              title: st.title,
              details: st.details || null,
              planned_start_offset_days: 0,
              planned_end_offset_days: 0,
              duration_days: 1,
              position: stIdx,
              technology_scope: 'both',
              assigned_role: '',
              parent_task_id: idx + 1,
              // Real identifiers and dates for project view
              subtask_uuid: st.id,
              planned_start: st.planned_start,
              planned_end: st.planned_end,
            })),
          })) as unknown) as MasterTask[];
        }
      } else {
        // Load master template data
        stepData = await wbsService.getMasterSteps();
        for (const step of stepData) {
          tasksData[step.id] = await wbsService.getStepTasks(step.id);
        }
      }
      
      setSteps(stepData);
      setStepTasks(tasksData);
    } catch (error) {
      console.error('Failed to load WBS data:', error);
      toast({
        title: "Error",
        description: "Failed to load WBS data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Convert WBS data to Gantt format with contract start as today
  const processWBSForGantt = (): StepGroup[] => {
    const contractStartDate = new Date(); // Use today as contract start
    const stepGroups: StepGroup[] = [];

    steps.forEach((step, stepIndex) => {
      const tasks = stepTasks[step.id] || [];
      const processedTasks: TaskWithDates[] = [];
      
      let stepStartOffset = 0; // Days from contract start
      let allDates: Date[] = [];

      tasks.forEach((task, taskIndex) => {
        let taskStart: Date;
        let taskEnd: Date;

        // Check if we have actual planned dates (project-specific view)
        if ((task as any).planned_start && (task as any).planned_end) {
          taskStart = new Date((task as any).planned_start);
          taskEnd = new Date((task as any).planned_end);
        } else {
          // Use offset-based calculation for master template
          const taskStartOffset = task.planned_start_offset_days || (taskIndex * 7);
          const taskDuration = (task.planned_end_offset_days || 0) - (task.planned_start_offset_days || 0) + 1;
          const actualDuration = Math.max(1, taskDuration);
          
          taskStart = new Date(contractStartDate);
          taskStart.setDate(taskStart.getDate() + taskStartOffset);
          
          taskEnd = new Date(taskStart);
          taskEnd.setDate(taskEnd.getDate() + actualDuration - 1);
        }

        allDates.push(taskStart, taskEnd);

        const processedSubtasks: TaskWithDates[] = task.subtasks?.map((subtask, subtaskIndex) => {
          let subtaskStart: Date;
          let subtaskEnd: Date;

          // Check if subtask has actual planned dates
          if ((subtask as any).planned_start && (subtask as any).planned_end) {
            subtaskStart = new Date((subtask as any).planned_start);
            subtaskEnd = new Date((subtask as any).planned_end);
          } else {
            const subtaskStartOffset = subtask.planned_start_offset_days || stepStartOffset + subtaskIndex;
            const subtaskDuration = (subtask.planned_end_offset_days || subtaskStartOffset) - subtaskStartOffset + 1;
            
            subtaskStart = new Date(contractStartDate);
            subtaskStart.setDate(subtaskStart.getDate() + subtaskStartOffset);
            subtaskEnd = new Date(subtaskStart);
            subtaskEnd.setDate(subtaskEnd.getDate() + Math.max(1, subtaskDuration) - 1);
          }

          allDates.push(subtaskStart, subtaskEnd);

          const subtaskDurationDays = Math.max(1, Math.ceil((subtaskEnd.getTime() - subtaskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

          return {
            id: (((subtask as any).subtask_uuid ?? subtask.id)).toString(),
            title: subtask.title,
            step_name: step.step_name,
            planned_start: subtaskStart.toISOString().split('T')[0],
            planned_end: subtaskEnd.toISOString().split('T')[0],
            duration_days: subtaskDurationDays,
            is_milestone: subtaskDurationDays === 1,
            level: 2,
            parent_id: (((task as any).project_task_uuid ?? task.id)).toString(),
          };
        }) || [];

        const taskDurationDays = Math.max(1, Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24)) + 1);

        const processedTask: TaskWithDates = {
          id: (((task as any).project_task_uuid ?? task.id)).toString(),
          title: task.title,
          step_name: step.step_name,
          planned_start: taskStart.toISOString().split('T')[0],
          planned_end: taskEnd.toISOString().split('T')[0],
          duration_days: taskDurationDays,
          is_milestone: taskDurationDays === 1,
          subtasks: processedSubtasks,
          level: 1,
          parent_id: step.id.toString(),
        };

        processedTasks.push(processedTask);
        
        // Update step start offset for next task (only used for offset-based calculation)
        if (!((task as any).planned_start)) {
          const taskStartOffset = task.planned_start_offset_days || (taskIndex * 7);
          const actualDuration = Math.max(1, (task.planned_end_offset_days || 0) - (task.planned_start_offset_days || 0) + 1);
          stepStartOffset = Math.max(stepStartOffset, taskStartOffset + actualDuration);
        }
      });

      // Calculate aggregated step dates (earliest start from all tasks/subtasks, latest end)
      const stepAggregatedStart = allDates.length > 0 
        ? new Date(Math.min(...allDates.map(d => d.getTime())))
        : null;
      const stepAggregatedEnd = allDates.length > 0 
        ? new Date(Math.max(...allDates.map(d => d.getTime())))
        : null;

      stepGroups.push({
        id: step.id.toString(),
        step_name: step.step_name,
        tasks: processedTasks,
        planned_start: stepAggregatedStart?.toISOString().split('T')[0] || null,
        planned_end: stepAggregatedEnd?.toISOString().split('T')[0] || null,
        aggregated_start: stepAggregatedStart?.toISOString().split('T')[0] || null,
        aggregated_end: stepAggregatedEnd?.toISOString().split('T')[0] || null,
        step_order: stepIndex,
        level: 0,
      });
    });

    return stepGroups.sort((a, b) => a.step_order - b.step_order);
  };

  const stepGroups = processWBSForGantt();
  
  // Initialize collapsed state for all items (default: all collapsed except steps)
  useEffect(() => {
    const initialState: CollapsibleState = {};
    stepGroups.forEach(step => {
      // Steps are always visible but collapsed by default
      initialState[step.id] = false;
      step.tasks.forEach(task => {
        initialState[task.id] = false;
        task.subtasks?.forEach(subtask => {
          initialState[subtask.id] = false;
        });
      });
    });
    setCollapsedItems(prev => ({ ...initialState, ...prev }));
  }, [stepGroups.length]);

  // Get all visible items based on collapse state
  const getVisibleItems = (): (StepGroup | TaskWithDates)[] => {
    const visibleItems: (StepGroup | TaskWithDates)[] = [];
    
    stepGroups.forEach(step => {
      // Steps are always visible
      visibleItems.push(step);
      
      // Show tasks if step is expanded
      if (collapsedItems[step.id]) {
        step.tasks.forEach(task => {
          visibleItems.push(task);
          
          // Show subtasks if task is expanded
          if (collapsedItems[task.id] && task.subtasks) {
            task.subtasks.forEach(subtask => {
              visibleItems.push(subtask);
            });
          }
        });
      }
    });
    
    return visibleItems;
  };

  const visibleItems = getVisibleItems();
  const allTasks = stepGroups.flatMap(group => group.tasks);
  const allSubtasks = allTasks.flatMap(task => task.subtasks || []);
  const allItems = [...allTasks, ...allSubtasks];

  // Helper functions for Gantt visualization
  const getItemColor = (item: TaskWithDates | StepGroup): string => {
    if ('level' in item) {
      if (item.level === 0) return 'hsl(var(--primary))'; // Steps - primary color
      if (item.level === 1) return 'hsl(var(--secondary))'; // Tasks - secondary color
      if (item.level === 2) return 'hsl(var(--accent))'; // Subtasks - accent color
    }
    if ('is_milestone' in item && item.is_milestone) return 'hsl(var(--destructive))'; // Milestones
    return 'hsl(var(--muted))';
  };

  const getItemOpacity = (item: TaskWithDates | StepGroup): number => {
    if ('level' in item) {
      if (item.level === 0) return 1.0; // Steps fully opaque
      if (item.level === 1) return 0.85; // Tasks slightly transparent
      if (item.level === 2) return 0.7; // Subtasks more transparent
    }
    return 0.8;
  };

  const getItemWidth = (item: TaskWithDates | StepGroup): number => {
    let startDate: string | null = null;
    let endDate: string | null = null;
    
    if ('aggregated_start' in item && 'aggregated_end' in item) {
      // For steps, use aggregated dates when collapsed, actual dates when expanded
      if (collapsedItems[item.id]) {
        startDate = item.planned_start;
        endDate = item.planned_end;
      } else {
        startDate = item.aggregated_start;
        endDate = item.aggregated_end;
      }
    } else {
      startDate = item.planned_start;
      endDate = item.planned_end;
    }
    
    if (!startDate || !endDate) return 20;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))) + 1;
    
    return Math.max(20, duration * 10 * zoomLevel);
  };

  const getItemPosition = (item: TaskWithDates | StepGroup): number => {
    let startDate: string | null = null;
    
    if ('aggregated_start' in item) {
      // For steps, use aggregated dates when collapsed, actual dates when expanded
      if (collapsedItems[item.id]) {
        startDate = item.planned_start;
      } else {
        startDate = item.aggregated_start;
      }
    } else {
      startDate = item.planned_start;
    }
    
    if (!startDate || allItems.length === 0) return 0;
    
    const start = new Date(startDate);
    const projectStart = allItems.reduce((earliest, i) => {
      if (!i.planned_start) return earliest;
      const itemStart = new Date(i.planned_start);
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);
    
    if (!projectStart) return 0;
    
    const daysDiff = Math.ceil((start.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff * 10 * zoomLevel);
  };

  const getTodayPosition = (): number => {
    if (allItems.length === 0) return 0;
    
    const today = new Date();
    const projectStart = allItems.reduce((earliest, i) => {
      if (!i.planned_start) return earliest;
      const itemStart = new Date(i.planned_start);
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);
    
    if (!projectStart) return 0;
    
    const daysDiff = Math.ceil((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysDiff * 10 * zoomLevel);
  };

  const generateDateMarkers = () => {
    if (allItems.length === 0) return [];

    const projectStart = allItems.reduce((earliest, i) => {
      if (!i.planned_start) return earliest;
      const itemStart = new Date(i.planned_start);
      return !earliest || itemStart < earliest ? itemStart : earliest;
    }, null as Date | null);

    const projectEnd = allItems.reduce((latest, i) => {
      if (!i.planned_end) return latest;
      const itemEnd = new Date(i.planned_end);
      return !latest || itemEnd > latest ? itemEnd : latest;
    }, null as Date | null);

    if (!projectStart || !projectEnd) return [];

    const markers = [];
    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));
    
    let interval = 7; // weekly by default
    if (totalDays > 180) interval = 30; // monthly for long projects
    if (totalDays < 30) interval = 3; // every 3 days for short projects

    for (let day = 0; day <= totalDays; day += interval) {
      const date = new Date(projectStart);
      date.setDate(date.getDate() + day);
      
      markers.push({
        date: date,
        position: day * 10 * zoomLevel,
        label: formatDateUK(date.toISOString().split('T')[0])
      });
    }

    return markers;
  };

  const todayPosition = getTodayPosition();
  const dateMarkers = generateDateMarkers();

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 3));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev / 1.2, 0.3));
  };

  const handleFitToScreen = () => {
    setZoomLevel(1);
  };

  const handleTogglePresentationMode = () => {
    setPresentationMode(!presentationMode);
  };

  // Collapse/Expand handlers
  const toggleItem = (itemId: string) => {
    setCollapsedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const handleExpandAll = () => {
    const newState: CollapsibleState = {};
    stepGroups.forEach(step => {
      newState[step.id] = true;
      step.tasks.forEach(task => {
        newState[task.id] = true;
        task.subtasks?.forEach(subtask => {
          newState[subtask.id] = true;
        });
      });
    });
    setCollapsedItems(newState);
    setExpandAll(true);
  };

  const handleCollapseAll = () => {
    const newState: CollapsibleState = {};
    stepGroups.forEach(step => {
      newState[step.id] = false;
      step.tasks.forEach(task => {
        newState[task.id] = false;
        task.subtasks?.forEach(subtask => {
          newState[subtask.id] = false;
        });
      });
    });
    setCollapsedItems(newState);
    setExpandAll(false);
  };

  const handleTaskClick = async (taskId: string) => {
    if (!projectId) return; // Only allow editing for project-specific view
    console.log('WBSGanttChart: handleTaskClick', taskId);
    
    try {
      const { data } = await supabase
        .from('project_tasks')
        .select('*, profiles:assignee(name)')
        .eq('id', taskId)
        .single();
      
      if (data) {
        setEditingTask(data);
      } else {
        console.warn('WBSGanttChart: No task found for id', taskId);
      }
    } catch (error) {
      console.error('Failed to load task:', error);
      toast({
        title: "Error",
        description: "Failed to load task details",
        variant: "destructive",
      });
    }
  };

  const handleSubtaskClick = async (subtaskId: string) => {
    if (!projectId) return; // Only allow editing for project-specific view
    console.log('WBSGanttChart: handleSubtaskClick', subtaskId);
    
    try {
      const { data } = await supabase
        .from('subtasks')
        .select('*, profiles:assignee(name)')
        .eq('id', subtaskId)
        .single();
      
      if (data) {
        setEditingSubtask(data);
      } else {
        console.warn('WBSGanttChart: No subtask found for id', subtaskId);
      }
    } catch (error) {
      console.error('Failed to load subtask:', error);
      toast({
        title: "Error",
        description: "Failed to load subtask details",
        variant: "destructive",
      });
    }
  };

  const handleTaskSave = async (updatedTask: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const { error } = await supabase.functions.invoke('update-task', {
        body: {
          id: updatedTask.id,
          task_title: updatedTask.task_title,
          task_details: updatedTask.task_details,
          planned_start: updatedTask.planned_start,
          planned_end: updatedTask.planned_end,
          actual_start: updatedTask.actual_start,
          actual_end: updatedTask.actual_end,
          status: updatedTask.status,
          assignee: updatedTask.assignee,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast({
        title: "Task Updated",
        description: "Task has been updated successfully",
      });

      setEditingTask(null);
      loadWBSData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleSubtaskSave = async (updatedSubtask: any) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .update({
          title: updatedSubtask.title,
          details: updatedSubtask.details,
          planned_start: updatedSubtask.planned_start,
          planned_end: updatedSubtask.planned_end,
          actual_start: updatedSubtask.actual_start,
          actual_end: updatedSubtask.actual_end,
          status: updatedSubtask.status,
          assignee: updatedSubtask.assignee,
        })
        .eq('id', updatedSubtask.id);

      if (error) throw error;

      toast({
        title: "Subtask Updated",
        description: "Subtask has been updated successfully",
      });

      setEditingSubtask(null);
      loadWBSData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update subtask",
        variant: "destructive",
      });
    }
  };

  // Excel Export functionality
  const exportToExcel = () => {
    setIsExporting(true);
    setExportModalOpen(false);

    try {
      toast({
        title: "Exporting...",
        description: "Generating Excel file...",
      });

      // Prepare data for Excel
      const excelData: any[] = [];
      
      stepGroups.forEach(step => {
        // Add step row
        excelData.push({
          'Level': 'Step',
          'Step Name': step.step_name,
          'Task Title': '',
          'Subtask Title': '',
          'Start Date': step.planned_start ? formatDateUK(step.planned_start) : '',
          'End Date': step.planned_end ? formatDateUK(step.planned_end) : '',
          'Duration (Days)': step.planned_start && step.planned_end 
            ? Math.ceil((new Date(step.planned_end).getTime() - new Date(step.planned_start).getTime()) / (1000 * 60 * 60 * 24)) + 1
            : '',
          'Status': '',
          'Assignee': '',
        });

        // Add task rows
        step.tasks.forEach(task => {
          excelData.push({
            'Level': 'Task',
            'Step Name': step.step_name,
            'Task Title': task.title,
            'Subtask Title': '',
            'Start Date': task.planned_start ? formatDateUK(task.planned_start) : '',
            'End Date': task.planned_end ? formatDateUK(task.planned_end) : '',
            'Duration (Days)': task.duration_days || '',
            'Status': task.is_milestone ? 'Milestone' : '',
            'Assignee': '',
          });

          // Add subtask rows
          task.subtasks?.forEach(subtask => {
            excelData.push({
              'Level': 'Subtask',
              'Step Name': step.step_name,
              'Task Title': task.title,
              'Subtask Title': subtask.title,
              'Start Date': subtask.planned_start ? formatDateUK(subtask.planned_start) : '',
              'End Date': subtask.planned_end ? formatDateUK(subtask.planned_end) : '',
              'Duration (Days)': subtask.duration_days || '',
              'Status': subtask.is_milestone ? 'Milestone' : '',
              'Assignee': '',
            });
          });
        });
      });

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // Level
        { wch: 25 },  // Step Name
        { wch: 30 },  // Task Title
        { wch: 30 },  // Subtask Title
        { wch: 12 },  // Start Date
        { wch: 12 },  // End Date
        { wch: 15 },  // Duration
        { wch: 12 },  // Status
        { wch: 20 },  // Assignee
      ];

      XLSX.utils.book_append_sheet(wb, ws, 'WBS Gantt Data');
      
      // Generate filename
      const filename = `wbs-gantt-data-${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, filename);

      toast({
        title: "Export Complete",
        description: "Excel file has been downloaded successfully",
      });
    } catch (error) {
      console.error('Excel export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export Excel file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // PDF Export functionality
  const exportToPDF = async () => {
    setIsExporting(true);
    setExportModalOpen(false);

    try {
      toast({
        title: "Exporting...",
        description: "Generating high-quality PDF, please wait...",
      });

      let element = document.querySelector('.wbs-gantt-print') as HTMLElement;
      if (!element) {
        throw new Error('Gantt chart element not found');
      }

      let canvas: HTMLCanvasElement;

      if (exportFormat === 'pdf-full') {
        // Full timeline export - capture entire chart without scroll
        const originalElement = element;
        
        // Create a hidden container for full rendering
        const fullContainer = document.createElement('div');
        fullContainer.style.position = 'absolute';
        fullContainer.style.left = '-9999px';
        fullContainer.style.top = '0';
        fullContainer.style.overflow = 'visible';
        fullContainer.style.width = 'max-content';
        fullContainer.style.backgroundColor = '#ffffff';
        document.body.appendChild(fullContainer);

        // Clone the gantt content
        const ganttContent = originalElement.cloneNode(true) as HTMLElement;
        
        // Remove scroll containers from clone
        const scrollContainers = ganttContent.querySelectorAll('[style*="overflow"]');
        scrollContainers.forEach(container => {
          (container as HTMLElement).style.overflow = 'visible';
          (container as HTMLElement).style.maxHeight = 'none';
          (container as HTMLElement).style.height = 'auto';
        });

        fullContainer.appendChild(ganttContent);

        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 100));

        canvas = await html2canvas(ganttContent, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          scrollX: 0,
          scrollY: 0,
          backgroundColor: '#ffffff',
          removeContainer: false,
          foreignObjectRendering: false,
          logging: false,
          width: ganttContent.scrollWidth,
          height: ganttContent.scrollHeight,
        });

        // Clean up
        document.body.removeChild(fullContainer);
      } else {
        // Fit to page export - use existing visible area
        canvas = await html2canvas(element, {
          useCORS: true,
          allowTaint: true,
          scale: 2,
          scrollX: 0,
          scrollY: 0,
          width: element.scrollWidth,
          height: element.scrollHeight,
          windowWidth: element.scrollWidth,
          windowHeight: element.scrollHeight,
          backgroundColor: '#ffffff',
          removeContainer: false,
          foreignObjectRendering: false,
          logging: false
        });
      }

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a3'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;

      if (exportFormat === 'pdf-fit') {
        // Single page export - scale to fit
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const finalHeight = Math.min(imgHeight, pageHeight - 2 * margin);
        const finalWidth = (canvas.width * finalHeight) / canvas.height;

        const imgData = canvas.toDataURL('image/png', 0.95);

        // Add title
        pdf.setFontSize(16);
        pdf.text('WBS Master Data Gantt Chart', margin, margin + 5);
        pdf.setFontSize(10);
        pdf.text(`Generated on: ${formatDateUK(new Date().toISOString().split('T')[0])}`, margin, margin + 10);
        pdf.text('Contract Start Date: Today (for planning purposes)', margin, margin + 15);

        pdf.addImage(imgData, 'PNG', margin, margin + 20, finalWidth, finalHeight);
      } else {
        // Multi-page export for full resolution
        const imgData = canvas.toDataURL('image/png', 0.95);
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        const pdfWidth = pageWidth - 2 * margin;
        const pdfHeight = pageHeight - 2 * margin - 25; // Leave space for header
        
        const widthRatio = pdfWidth / imgWidth;
        const heightRatio = pdfHeight / imgHeight;
        const ratio = Math.min(widthRatio, heightRatio);
        
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;
        
        // Calculate how many pages we need
        const totalPages = Math.ceil(scaledWidth / pdfWidth);
        
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) pdf.addPage();
          
          // Add header to each page
          pdf.setFontSize(16);
          pdf.text('WBS Master Data Gantt Chart', margin, margin + 5);
          pdf.setFontSize(10);
          pdf.text(`Generated on: ${formatDateUK(new Date().toISOString().split('T')[0])} | Page ${page + 1} of ${totalPages}`, margin, margin + 10);
          pdf.text('Contract Start Date: Today (for planning purposes)', margin, margin + 15);
          
          // Calculate the portion of image to show on this page
          const startX = page * pdfWidth;
          const sourceX = startX / ratio;
          const sourceWidth = Math.min(pdfWidth / ratio, imgWidth - sourceX);
          const destWidth = sourceWidth * ratio;
          
          // Create a temporary canvas for this slice
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = sourceWidth;
          tempCanvas.height = imgHeight;
          
          if (tempCtx) {
            tempCtx.drawImage(canvas, sourceX, 0, sourceWidth, imgHeight, 0, 0, sourceWidth, imgHeight);
            const tempImgData = tempCanvas.toDataURL('image/png', 0.95);
            pdf.addImage(tempImgData, 'PNG', margin, margin + 20, destWidth, scaledHeight);
          }
        }
      }

      pdf.save(`wbs-gantt-chart-${new Date().toISOString().split('T')[0]}.pdf`);

      toast({
        title: "Export Complete",
        description: "PDF has been downloaded successfully",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel();
    } else {
      exportToPDF();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading WBS Gantt chart...</p>
      </div>
    );
  }

  if (stepGroups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">No WBS data available for Gantt chart</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={`w-full ${presentationMode ? 'border-none shadow-none' : ''} wbs-gantt-print`}>
      <CardHeader className={presentationMode ? 'hidden' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5" />
              WBS Master Data Gantt Chart
            </CardTitle>
            <CardDescription>
              Timeline view of Work Breakdown Structure master data (Contract start: Today)
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 0.3}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground min-w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 3}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFitToScreen}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTogglePresentationMode}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              disabled={expandAll}
            >
              <Expand className="h-4 w-4 mr-1" />
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCollapseAll}
              disabled={!expandAll}
            >
              <Minimize className="h-4 w-4 mr-1" />
              Collapse All
            </Button>
            <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  <FileDown className="h-4 w-4 mr-2" />
                  Export PDF
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Export Gantt Chart</DialogTitle>
                  <DialogDescription>
                    Choose export options for your WBS Gantt chart
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label htmlFor="export-format">Export Format</Label>
                    <div className="space-y-3">
                      <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <input
                          type="radio"
                          name="export-format"
                          value="pdf-full"
                          checked={exportFormat === 'pdf-full'}
                          onChange={(e) => setExportFormat(e.target.value as 'pdf-full' | 'pdf-fit' | 'excel')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium">PDF - Full Timeline</div>
                          <div className="text-sm text-muted-foreground">Complete Gantt chart with all tasks/steps visible. Multi-page if needed.</div>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <input
                          type="radio"
                          name="export-format"
                          value="pdf-fit"
                          checked={exportFormat === 'pdf-fit'}
                          onChange={(e) => setExportFormat(e.target.value as 'pdf-full' | 'pdf-fit' | 'excel')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium">PDF - Fit to Page</div>
                          <div className="text-sm text-muted-foreground">Quick overview scaled to fit a single page. Best for presentations.</div>
                        </div>
                      </label>
                      
                      <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-accent/50 transition-colors">
                        <input
                          type="radio"
                          name="export-format"
                          value="excel"
                          checked={exportFormat === 'excel'}
                          onChange={(e) => setExportFormat(e.target.value as 'pdf-full' | 'pdf-fit' | 'excel')}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium">Excel - Data Export</div>
                          <div className="text-sm text-muted-foreground">Structured data table with all steps, tasks, and dates. Perfect for analysis.</div>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  {exportFormat === 'pdf-full' && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        ⚠️ Large projects may take longer to export and could use significant memory.
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setExportModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleExport} disabled={isExporting}>
                      {isExporting ? 'Exporting...' : exportFormat === 'excel' ? 'Export Excel' : 'Export PDF'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div 
          className="overflow-auto border rounded-lg bg-background"
          style={{ 
            maxHeight: presentationMode ? 'none' : '70vh',
            minHeight: '400px'
          }}
        >
          {/* Timeline Header */}
          <div className="sticky top-0 z-20 bg-background border-b">
            <div className="flex">
              {/* Tasks column header */}
              <div className="w-80 p-4 border-r bg-muted/50 font-semibold">
                Tasks & Timeline
              </div>
              
              {/* Date markers header */}
              <div className="flex-1 relative p-2 bg-muted/30">
                <div className="flex items-center text-xs text-muted-foreground mb-2">
                  <span>Timeline ({Math.round(zoomLevel * 100)}% zoom)</span>
                </div>
                <div className="relative h-6">
                  {dateMarkers.map((marker, index) => (
                    <div
                      key={index}
                      className="absolute top-0 text-xs text-muted-foreground whitespace-nowrap"
                      style={{ left: `${marker.position}px` }}
                    >
                      <div className="w-px h-4 bg-border mr-1"></div>
                      {marker.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Gantt Chart Content */}
          <div className="relative">
            {/* Today line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
              style={{ left: `${320 + todayPosition}px` }}
            >
              <div className="absolute -top-4 -left-8 text-xs text-red-500 font-medium bg-background px-1 rounded">
                Today
              </div>
            </div>

            {/* Hierarchical Items */}
            {visibleItems.map((item, index) => {
              const isStep = 'step_name' in item && 'tasks' in item;
              const isTask = !isStep && 'level' in item && item.level === 1;
              const isSubtask = !isStep && 'level' in item && item.level === 2;
              const canEdit = projectId && (isTask || isSubtask); // Only allow editing tasks/subtasks in project view
              
              let indentLevel = 0;
              let hasChildren = false;
              let isExpanded = false;
              
              if (isStep) {
                indentLevel = 0;
                hasChildren = (item as StepGroup).tasks.length > 0;
                isExpanded = collapsedItems[item.id];
              } else if (isTask) {
                indentLevel = 1;
                hasChildren = ((item as TaskWithDates).subtasks?.length || 0) > 0;
                isExpanded = collapsedItems[item.id];
              } else if (isSubtask) {
                indentLevel = 2;
                hasChildren = false;
                isExpanded = false;
              }

              const bgColorClass = isStep 
                ? 'bg-background' 
                : isTask 
                  ? 'bg-muted/10' 
                  : 'bg-muted/20';
              
              const hoverClass = isStep 
                ? 'hover:bg-muted/30' 
                : isTask 
                  ? 'hover:bg-muted/50' 
                  : 'hover:bg-muted/70';

              return (
                <div key={`${item.id}-${index}`} className={`border-b border-border/50 ${bgColorClass}`}>
                  <div 
                    className={`flex items-center ${hoverClass} transition-colors animate-fade-in ${canEdit ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (canEdit) {
                        if (isTask) handleTaskClick(item.id);
                        if (isSubtask) handleSubtaskClick(item.id);
                      }
                    }}
                  >
                    {/* Item Info with Hierarchy */}
                    <div className="w-80 p-2 border-r flex items-center gap-2">
                      <div style={{ marginLeft: `${indentLevel * 16}px` }} className="flex items-center gap-1">
                        {/* Expand/Collapse Button */}
                        {hasChildren && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleItem(item.id);
                            }}
                            className="p-1 hover:bg-muted rounded transition-colors"
                            title={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </button>
                        )}
                        {!hasChildren && <div className="w-5"></div>}
                        
                        {/* Item Title */}
                        <div className="flex items-center gap-2 flex-1">
                          <div className={`${isStep ? 'text-sm font-semibold text-primary' : isTask ? 'text-sm font-medium' : 'text-sm'}`}>
                            {isStep ? (item as StepGroup).step_name : (item as TaskWithDates).title}
                          </div>
                          
                          {/* Additional Info */}
                          {isStep && (
                            <span className="text-xs text-muted-foreground">
                              ({(item as StepGroup).tasks.length} tasks)
                            </span>
                          )}
                          {!isStep && (item as TaskWithDates).is_milestone && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded">
                              Milestone
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Expand/Collapse Button on Timeline Side */}
                      {hasChildren && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleItem(item.id);
                          }}
                          className="p-1 hover:bg-muted rounded transition-colors ml-auto"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Timeline Bar */}
                    <div className="flex-1 relative p-2" style={{ minHeight: isStep ? '44px' : isTask ? '36px' : '28px' }}>
                      <div
                        className={`rounded transition-all duration-200 flex items-center justify-start pl-2 text-xs font-medium text-white shadow-sm hover-scale`}
                        style={{
                          backgroundColor: getItemColor(item),
                          opacity: getItemOpacity(item),
                          width: `${getItemWidth(item)}px`,
                          marginLeft: `${getItemPosition(item)}px`,
                          height: isStep ? '24px' : isTask ? '16px' : '12px',
                        }}
                      >
                        {getItemWidth(item) > (isStep ? 80 : isTask ? 60 : 40) && (
                          <span className="truncate">
                            {isStep ? (item as StepGroup).step_name : (item as TaskWithDates).title}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className={`mt-4 p-4 bg-muted/30 rounded-lg ${presentationMode ? 'hidden' : ''}`}>
          <div className="text-sm font-medium mb-2">Legend</div>
          <div className="flex flex-wrap gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
              <span>Steps (always visible)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--secondary))' }}></div>
              <span>Tasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--accent))' }}></div>
              <span>Subtasks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'hsl(var(--destructive))' }}></div>
              <span>Milestones</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-px h-4 bg-red-500"></div>
              <span>Today</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <ChevronRight className="h-3 w-3" />
              <span>Click to expand/collapse</span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Custom print styles */}
      <style>{`
        @media print {
          .wbs-gantt-print {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .wbs-gantt-print * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
      }
      `}</style>

      {/* Task Edit Dialog */}
      {editingTask && (
        <TaskEditDialog
          task={editingTask}
          profiles={profiles}
          open={!!editingTask}
          onOpenChange={(open) => !open && setEditingTask(null)}
          onSave={handleTaskSave}
        />
      )}

      {/* Subtask Edit Sidebar */}
      {editingSubtask && (
        <SubtaskEditSidebar
          open={!!editingSubtask}
          onOpenChange={(open) => !open && setEditingSubtask(null)}
          subtask={editingSubtask}
          profiles={profiles}
          onSave={handleSubtaskSave}
        />
      )}
    </Card>
  );
}