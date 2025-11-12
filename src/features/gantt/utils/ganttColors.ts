/**
 * Color mapping for Gantt chart items based on status and deadlines
 * Uses HSL semantic tokens from design system
 */

import { GanttItemStatus } from '../types/gantt.types';

/**
 * Get HSL color for a Gantt item based on status and deadline
 */
export function getItemColor(
  status: GanttItemStatus,
  plannedEnd: Date | null,
  actualEnd: Date | null
): string {
  // If completed, show success color
  if (status === 'completed' || actualEnd) {
    return 'hsl(var(--chart-2))'; // Green - success
  }

  // If blocked, show destructive color
  if (status === 'blocked') {
    return 'hsl(var(--destructive))'; // Red - blocked
  }

  // If overdue, show warning color
  if (status === 'overdue' || (plannedEnd && new Date() > plannedEnd && !actualEnd)) {
    return 'hsl(var(--chart-5))'; // Orange/Yellow - warning
  }

  // If in progress, show primary color
  if (status === 'in-progress') {
    return 'hsl(var(--primary))'; // Primary brand color
  }

  // Not started - show muted color
  return 'hsl(var(--muted))'; // Grey - not started
}

/**
 * Get contrasting text color for a given background color
 */
export function getTextColor(backgroundColor: string): string {
  // For dark backgrounds, use foreground color
  // For light backgrounds, use primary-foreground or muted-foreground
  
  // Simple heuristic: if background is muted, use muted-foreground
  if (backgroundColor.includes('muted')) {
    return 'hsl(var(--muted-foreground))';
  }
  
  // For colored backgrounds, use white/foreground
  return 'hsl(var(--primary-foreground))';
}

/**
 * Get event color based on criticality
 */
export function getEventColor(isCritical: boolean): string {
  return isCritical 
    ? 'hsl(var(--destructive))' // Red for critical events
    : 'hsl(var(--chart-3))'; // Blue for normal events
}

/**
 * Get status badge variant for UI display
 */
export function getStatusBadgeVariant(status: GanttItemStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'default'; // Uses primary color
    case 'in-progress':
      return 'secondary';
    case 'blocked':
    case 'overdue':
      return 'destructive';
    default:
      return 'outline';
  }
}

/**
 * Color palette for different item types (steps, tasks, subtasks)
 */
export const GANTT_COLOR_PALETTE = {
  step: 'hsl(var(--chart-1))',
  task: 'hsl(var(--chart-2))',
  subtask: 'hsl(var(--chart-3))',
  event: 'hsl(var(--chart-4))',
  today: 'hsl(var(--destructive))',
  weekend: 'hsl(var(--muted) / 0.3)',
  holiday: 'hsl(var(--accent) / 0.2)',
} as const;

/**
 * Opacity values for different states
 */
export const GANTT_OPACITY = {
  active: 1,
  hover: 0.8,
  collapsed: 0.6,
  disabled: 0.4,
} as const;

export const ganttColors = {
  getItemColor,
  getTextColor,
  getEventColor,
  getStatusBadgeVariant,
};
