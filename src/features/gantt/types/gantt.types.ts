/**
 * Type definitions for Gantt chart system
 */

export type GanttItemType = 'step' | 'task' | 'subtask' | 'event';
export type GanttItemStatus = 'not-started' | 'in-progress' | 'completed' | 'overdue' | 'blocked';
export type GanttViewMode = 'step' | 'task';
export type GanttExportFormat = 'pdf' | 'png' | 'svg' | 'csv' | 'json';
export type GanttProjectType = 'implementation' | 'solutions';

/**
 * Base interface for all Gantt items
 */
export interface GanttItemBase {
  id: string;
  name: string;
  type: GanttItemType;
  status: GanttItemStatus;
  plannedStart: Date | null;
  plannedEnd: Date | null;
  actualStart: Date | null;
  actualEnd: Date | null;
  assigneeId?: string;
  assigneeName?: string;
}

/**
 * Step in the Gantt chart (master_steps)
 */
export interface GanttStep extends GanttItemBase {
  type: 'step';
  position: number;
  tasks: GanttTask[];
  isCollapsed?: boolean;
}

/**
 * Task in the Gantt chart (project_tasks)
 */
export interface GanttTask extends GanttItemBase {
  type: 'task';
  stepName: string;
  stepPosition: number;
  parentTaskId?: string;
  subtasks?: GanttSubtask[];
  dependencies?: string[]; // Task IDs this task depends on
  isCollapsed?: boolean;
}

/**
 * Subtask in the Gantt chart
 */
export interface GanttSubtask extends GanttItemBase {
  type: 'subtask';
  taskId: string;
  stepName: string;
}

/**
 * Event in the Gantt chart (project_events)
 */
export interface GanttEvent {
  id: string;
  type: 'event';
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isCritical: boolean;
  attendees: EventAttendee[];
}

export interface EventAttendee {
  id: string;
  userId: string;
  name: string;
}

/**
 * Union type of all Gantt items
 */
export type GanttItem = GanttStep | GanttTask | GanttSubtask;

/**
 * Layout information for rendering an item
 */
export interface GanttItemLayout {
  id: string;
  x: number; // Horizontal position (pixels from start)
  y: number; // Vertical position (row index)
  width: number; // Bar width in pixels
  height: number; // Bar height in pixels
  color: string; // HSL color string
  textColor: string; // Contrasting text color
  isVisible: boolean; // Whether item is in viewport
}

/**
 * Date marker for timeline axis
 */
export interface DateMarker {
  date: Date;
  position: number; // X position in pixels
  label: string; // Formatted date string
  isToday: boolean;
  isWeekend?: boolean;
  isHoliday?: boolean;
}

/**
 * Gantt chart configuration
 */
export interface GanttConfig {
  projectId: string;
  projectType: GanttProjectType;
  viewMode: GanttViewMode;
  showWorkingDaysOnly: boolean;
  zoomLevel: number; // 0.5 to 3.0
  presentationMode: boolean;
  showEvents: boolean;
  showDependencies: boolean;
}

/**
 * Export options
 */
export interface GanttExportOptions {
  format: GanttExportFormat;
  projectName: string;
  includeEvents: boolean;
  detailLevel: 'steps' | 'tasks';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Data fetching response from Supabase
 */
export interface GanttDataResponse {
  steps: GanttStep[];
  tasks: GanttTask[];
  subtasks: GanttSubtask[];
  events: GanttEvent[];
  projectName: string;
  customerName: string;
}

/**
 * Virtual scrolling item
 */
export interface VirtualGanttItem {
  index: number;
  start: number; // Y position
  size: number; // Height
  item: GanttItem;
  layout: GanttItemLayout;
}
