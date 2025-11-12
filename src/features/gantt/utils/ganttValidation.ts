/**
 * Validation utilities for Gantt chart data
 */

import { GanttItem, GanttStep, GanttTask, GanttSubtask, GanttEvent } from '../types/gantt.types';

/**
 * Validate that a Gantt item has valid dates
 */
export function hasValidDates(item: GanttItem): boolean {
  if (!item.plannedStart || !item.plannedEnd) return false;
  return item.plannedStart <= item.plannedEnd;
}

/**
 * Validate that a step has tasks
 */
export function stepHasTasks(step: GanttStep): boolean {
  return step.tasks && step.tasks.length > 0;
}

/**
 * Validate that a task belongs to a step
 */
export function taskBelongsToStep(task: GanttTask, stepName: string): boolean {
  return task.stepName === stepName;
}

/**
 * Validate that a subtask belongs to a task
 */
export function subtaskBelongsToTask(subtask: GanttSubtask, taskId: string): boolean {
  return subtask.taskId === taskId;
}

/**
 * Validate that an event has valid dates
 */
export function eventHasValidDates(event: GanttEvent): boolean {
  return event.startDate <= event.endDate;
}

/**
 * Check if an item is overdue
 */
export function isItemOverdue(item: GanttItem): boolean {
  if (!item.plannedEnd) return false;
  if (item.actualEnd) return false; // Completed items are not overdue
  if (item.status === 'completed') return false;
  
  const today = new Date();
  return item.plannedEnd < today;
}

/**
 * Check if an item is in progress
 */
export function isItemInProgress(item: GanttItem): boolean {
  if (item.status === 'in-progress') return true;
  return item.actualStart !== null && item.actualEnd === null;
}

/**
 * Check if an item is completed
 */
export function isItemCompleted(item: GanttItem): boolean {
  if (item.status === 'completed') return true;
  return item.actualEnd !== null;
}

/**
 * Validate circular dependencies
 */
export function hasCircularDependency(
  taskId: string,
  dependencyId: string,
  allTasks: GanttTask[]
): boolean {
  const visited = new Set<string>();
  
  function checkCircular(currentId: string): boolean {
    if (currentId === taskId) return true;
    if (visited.has(currentId)) return false;
    
    visited.add(currentId);
    
    const task = allTasks.find(t => t.id === currentId);
    if (!task || !task.dependencies) return false;
    
    return task.dependencies.some(depId => checkCircular(depId));
  }
  
  return checkCircular(dependencyId);
}

/**
 * Validate that all required fields are present
 */
export function validateGanttItem(item: Partial<GanttItem>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!item.id) errors.push('Missing ID');
  if (!item.name) errors.push('Missing name');
  if (!item.type) errors.push('Missing type');
  
  if (item.plannedStart && item.plannedEnd && item.plannedStart > item.plannedEnd) {
    errors.push('Planned start date must be before planned end date');
  }
  
  if (item.actualStart && item.actualEnd && item.actualStart > item.actualEnd) {
    errors.push('Actual start date must be before actual end date');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Filter out items with invalid data
 */
export function filterValidItems<T extends GanttItem>(items: T[]): T[] {
  return items.filter(item => {
    const validation = validateGanttItem(item);
    if (!validation.valid) {
      console.warn(`Invalid Gantt item filtered out: ${item.name}`, validation.errors);
    }
    return validation.valid;
  });
}

export const ganttValidation = {
  hasValidDates,
  stepHasTasks,
  taskBelongsToStep,
  subtaskBelongsToTask,
  eventHasValidDates,
  isItemOverdue,
  isItemInProgress,
  isItemCompleted,
  hasCircularDependency,
  validateGanttItem,
  filterValidItems,
};
