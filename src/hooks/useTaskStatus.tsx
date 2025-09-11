import { useMemo } from 'react';
import { computeTaskStatus, TaskStatusData, TaskStatusResult } from '@/lib/taskStatus';

/**
 * Custom hook for computing task status
 * @param task - Task data with planned and actual dates
 * @returns Computed status, color, and background color
 */
export const useTaskStatus = (task: TaskStatusData): TaskStatusResult => {
  return useMemo(() => computeTaskStatus(task), [
    task.planned_start,
    task.planned_end,
    task.actual_start,
    task.actual_end
  ]);
};

/**
 * Hook for computing status for multiple tasks
 * @param tasks - Array of task data
 * @returns Array of computed status results
 */
export const useTasksStatus = (tasks: TaskStatusData[]): TaskStatusResult[] => {
  return useMemo(
    () => tasks.map(task => computeTaskStatus(task)),
    [tasks]
  );
};