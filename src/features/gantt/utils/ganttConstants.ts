/**
 * Constants for Gantt chart layout and rendering
 */

/**
 * Row heights
 */
export const ROW_HEIGHT = 40; // pixels
export const STEP_ROW_HEIGHT = 48; // pixels (slightly taller for emphasis)
export const EVENT_ROW_HEIGHT = 32; // pixels (compact for events)
export const ROW_PADDING = 4; // pixels (vertical padding within row)

/**
 * Timeline dimensions
 */
export const DEFAULT_DAY_WIDTH = 30; // pixels per day at 1x zoom
export const MIN_DAY_WIDTH = 15; // pixels per day at 0.5x zoom
export const MAX_DAY_WIDTH = 60; // pixels per day at 2x zoom

/**
 * Zoom levels
 */
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export const DEFAULT_ZOOM_LEVEL = 1;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const ZOOM_STEP = 0.25;

/**
 * Virtual scrolling configuration
 */
export const VIRTUAL_OVERSCAN = 5; // Number of items to render outside viewport
export const VIRTUAL_ESTIMATESIZE = ROW_HEIGHT; // Estimated item size for virtualization

/**
 * Sidebar/header dimensions
 */
export const SIDEBAR_WIDTH = 300; // pixels (task name column)
export const HEADER_HEIGHT = 60; // pixels (date axis header)
export const CONTROLS_HEIGHT = 60; // pixels (zoom/view controls)

/**
 * Export dimensions
 */
export const EXPORT_PDF_WIDTH_MM = 297; // A3 landscape width
export const EXPORT_PDF_HEIGHT_MM = 210; // A3 landscape height
export const EXPORT_PNG_SCALE = 2; // 2x resolution for Retina displays
export const EXPORT_MARGIN_MM = 10; // Margin around exported content

/**
 * Animation durations (milliseconds)
 */
export const ANIMATION_DURATION = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

/**
 * Bar styling
 */
export const BAR_BORDER_RADIUS = 4; // pixels
export const BAR_MIN_WIDTH = 20; // pixels (minimum visible width)
export const BAR_OPACITY_HOVER = 0.8;
export const BAR_OPACITY_SELECTED = 1;
export const BAR_OPACITY_COLLAPSED = 0.6;

/**
 * Dependency line styling
 */
export const DEPENDENCY_LINE_WIDTH = 2; // pixels
export const DEPENDENCY_LINE_COLOR = 'hsl(var(--border))';
export const DEPENDENCY_ARROW_SIZE = 6; // pixels

/**
 * Today line styling
 */
export const TODAY_LINE_WIDTH = 2; // pixels
export const TODAY_LINE_DASH_ARRAY = '4 4';

/**
 * Grid styling
 */
export const GRID_LINE_COLOR = 'hsl(var(--border) / 0.2)';
export const GRID_WEEKEND_COLOR = 'hsl(var(--muted) / 0.1)';
export const GRID_HOLIDAY_COLOR = 'hsl(var(--accent) / 0.1)';

/**
 * Font sizes
 */
export const FONT_SIZE = {
  small: 11,
  normal: 12,
  large: 14,
  title: 16,
} as const;

/**
 * Z-index layers
 */
export const Z_INDEX = {
  background: 1,
  grid: 2,
  bars: 3,
  dependencies: 4,
  todayLine: 5,
  events: 6,
  controls: 10,
} as const;

/**
 * Accessibility
 */
export const KEYBOARD_NAVIGATION = {
  enabled: true,
  scrollSpeed: ROW_HEIGHT, // pixels per arrow key press
} as const;

/**
 * Performance thresholds
 */
export const PERFORMANCE = {
  maxItemsBeforeVirtualization: 50, // Use virtual scrolling above this count
  debounceDelay: 150, // ms for scroll/resize events
  throttleDelay: 100, // ms for drag operations
} as const;

/**
 * Date format patterns
 */
export const DATE_FORMATS = {
  axis: 'dd MMM', // "01 Jan"
  tooltip: 'dd MMM yyyy', // "01 Jan 2025"
  export: 'dd/MM/yyyy', // "01/01/2025"
  full: 'dd MMM yyyy HH:mm', // "01 Jan 2025 14:30"
} as const;

/**
 * Export filename templates
 */
export const EXPORT_FILENAME_TEMPLATE = {
  pdf: 'gantt-{projectName}-{date}.pdf',
  png: 'gantt-{projectName}-{date}.png',
  svg: 'gantt-{projectName}-{date}.svg',
  csv: 'gantt-{projectName}-{date}.csv',
  json: 'gantt-{projectName}-{date}.json',
} as const;

export const ganttConstants = {
  ROW_HEIGHT,
  STEP_ROW_HEIGHT,
  EVENT_ROW_HEIGHT,
  DEFAULT_DAY_WIDTH,
  DEFAULT_ZOOM_LEVEL,
  ZOOM_LEVELS,
  SIDEBAR_WIDTH,
  HEADER_HEIGHT,
  DATE_FORMATS,
};
