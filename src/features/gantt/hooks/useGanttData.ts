/**
 * TanStack Query hook for fetching Gantt chart data from Supabase
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GanttDataResponse, GanttStep, GanttTask, GanttSubtask, GanttEvent, GanttProjectType } from '../types/gantt.types';
import { workingCalendarService } from '../services/workingCalendarService';

interface UseGanttDataProps {
  projectId: string;
  projectType: GanttProjectType;
}

/**
 * Fetch complete Gantt chart data for a project
 */
export function useGanttData({ projectId, projectType }: UseGanttDataProps) {
  return useQuery({
    queryKey: ['gantt-data', projectId, projectType],
    queryFn: async (): Promise<GanttDataResponse> => {
      // Ensure holidays are loaded for working calendar calculations
      await workingCalendarService.loadHolidays();

      // Fetch step positions for ordering
      const { data: stepData, error: stepError } = await supabase
        .from('master_steps')
        .select('name, position')
        .order('position');

      if (stepError) throw stepError;

      const stepPositions: Record<string, number> = {};
      stepData?.forEach(step => {
        stepPositions[step.name] = step.position;
      });

      // Fetch project details
      let projectName = 'Unnamed Project';
      let customerName = 'Unknown Customer';

      if (projectType === 'implementation') {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .select('name, companies(name)')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        projectName = projectData.name || 'Unnamed Project';
        customerName = projectData.companies?.name || 'Unknown Customer';
      } else {
        const { data: projectData, error: projectError } = await supabase
          .from('solutions_projects')
          .select('site_name, companies(name)')
          .eq('id', projectId)
          .single();

        if (projectError) throw projectError;
        projectName = projectData.site_name || 'Unnamed Project';
        customerName = projectData.companies?.name || 'Unknown Customer';
      }

      // Fetch tasks
      const taskQuery = supabase
        .from('project_tasks')
        .select('*')
        .order('step_name');

      if (projectType === 'implementation') {
        taskQuery.eq('project_id', projectId);
      } else {
        taskQuery.eq('solutions_project_id', projectId);
      }

      const { data: tasksData, error: tasksError } = await taskQuery;
      if (tasksError) throw tasksError;

      // Fetch subtasks
      const taskIds = tasksData?.map(t => t.id) || [];
      const { data: subtasksData, error: subtasksError } = await supabase
        .from('subtasks')
        .select('*')
        .in('task_id', taskIds)
        .order('created_at');

      if (subtasksError) throw subtasksError;

      // Fetch events
      const eventQuery = supabase
        .from('project_events')
        .select('id, title, description, start_date, end_date, is_critical')
        .order('start_date');

      if (projectType === 'implementation') {
        eventQuery.eq('project_id', projectId);
      } else {
        eventQuery.eq('solutions_project_id', projectId);
      }

      const { data: eventsData, error: eventsError } = await eventQuery;
      if (eventsError) throw eventsError;

      // Transform tasks
      const tasks: GanttTask[] = (tasksData || []).map(task => ({
        id: task.id,
        name: task.task_title,
        type: 'task' as const,
        status: mapTaskStatus(task.status, task.planned_end, task.actual_end),
        plannedStart: task.planned_start ? new Date(task.planned_start) : null,
        plannedEnd: task.planned_end ? new Date(task.planned_end) : null,
        actualStart: task.actual_start ? new Date(task.actual_start) : null,
        actualEnd: task.actual_end ? new Date(task.actual_end) : null,
        stepName: task.step_name,
        stepPosition: stepPositions[task.step_name] || 0,
        parentTaskId: task.parent_task_id || undefined,
        assigneeId: task.assignee || undefined,
        assigneeName: undefined, // TODO: Fetch from profiles if needed
        subtasks: [],
        dependencies: [],
      }));

      // Transform subtasks and attach to tasks
      const subtasks: GanttSubtask[] = (subtasksData || []).map(subtask => ({
        id: subtask.id,
        name: subtask.title,
        type: 'subtask' as const,
        status: mapTaskStatus(subtask.status, subtask.planned_end, subtask.actual_end),
        plannedStart: subtask.planned_start ? new Date(subtask.planned_start) : null,
        plannedEnd: subtask.planned_end ? new Date(subtask.planned_end) : null,
        actualStart: subtask.actual_start ? new Date(subtask.actual_start) : null,
        actualEnd: subtask.actual_end ? new Date(subtask.actual_end) : null,
        taskId: subtask.task_id,
        stepName: tasks.find(t => t.id === subtask.task_id)?.stepName || '',
      }));

      // Attach subtasks to tasks
      tasks.forEach(task => {
        task.subtasks = subtasks.filter(s => s.taskId === task.id);
      });

      // Group tasks by step
      const stepGroups = new Map<string, GanttTask[]>();
      tasks.forEach(task => {
        if (!task.parentTaskId) { // Only top-level tasks
          const stepTasks = stepGroups.get(task.stepName) || [];
          stepTasks.push(task);
          stepGroups.set(task.stepName, stepTasks);
        }
      });

      // Create steps
      const steps: GanttStep[] = Array.from(stepGroups.entries()).map(([stepName, stepTasks]) => {
        const allDates = stepTasks.flatMap(t => [
          t.plannedStart,
          t.plannedEnd,
          t.actualStart,
          t.actualEnd,
          ...(t.subtasks?.flatMap(s => [s.plannedStart, s.plannedEnd, s.actualStart, s.actualEnd]) || [])
        ].filter((d): d is Date => d !== null));

        const plannedStarts = stepTasks.map(t => t.plannedStart).filter((d): d is Date => d !== null);
        const plannedEnds = stepTasks.map(t => t.plannedEnd).filter((d): d is Date => d !== null);

        return {
          id: stepName,
          name: stepName,
          type: 'step' as const,
          status: calculateStepStatus(stepTasks),
          plannedStart: plannedStarts.length > 0 ? new Date(Math.min(...plannedStarts.map(d => d.getTime()))) : null,
          plannedEnd: plannedEnds.length > 0 ? new Date(Math.max(...plannedEnds.map(d => d.getTime()))) : null,
          actualStart: null, // TODO: Calculate from tasks
          actualEnd: null, // TODO: Calculate from tasks
          position: stepPositions[stepName] || 0,
          tasks: stepTasks,
          isCollapsed: false,
        };
      }).sort((a, b) => a.position - b.position);

      // Transform events (simplified - no attendees for now)
      const events: GanttEvent[] = (eventsData || []).map(event => ({
        id: event.id,
        type: 'event' as const,
        title: event.title,
        description: event.description || undefined,
        startDate: new Date(event.start_date),
        endDate: new Date(event.end_date),
        isCritical: event.is_critical,
        attendees: [], // TODO: Fetch attendees separately if needed
      }));

      return {
        steps,
        tasks,
        subtasks,
        events,
        projectName,
        customerName,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Map task status string to GanttItemStatus enum
 */
function mapTaskStatus(
  status: string | null,
  plannedEnd: string | null,
  actualEnd: string | null
): 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'blocked' {
  if (actualEnd) return 'completed';
  if (status === 'blocked') return 'blocked';
  if (plannedEnd && new Date(plannedEnd) < new Date() && !actualEnd) return 'overdue';
  if (status === 'in-progress') return 'in-progress';
  return 'not-started';
}

/**
 * Calculate overall step status from its tasks
 */
function calculateStepStatus(tasks: GanttTask[]): 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'blocked' {
  if (tasks.length === 0) return 'not-started';

  const hasBlocked = tasks.some(t => t.status === 'blocked');
  if (hasBlocked) return 'blocked';

  const allCompleted = tasks.every(t => t.status === 'completed');
  if (allCompleted) return 'completed';

  const hasOverdue = tasks.some(t => t.status === 'overdue');
  if (hasOverdue) return 'overdue';

  const hasInProgress = tasks.some(t => t.status === 'in-progress');
  if (hasInProgress) return 'in-progress';

  return 'not-started';
}
