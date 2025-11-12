/**
 * Centralized date calculation service for Gantt charts
 * Single source of truth for all date-related logic
 */

import { 
  addDays, 
  differenceInDays, 
  eachDayOfInterval, 
  format, 
  isToday,
  isSameDay,
  startOfDay,
  endOfDay,
  min,
  max,
} from 'date-fns';
import { DateMarker } from '../types/gantt.types';
import { workingCalendarService } from './workingCalendarService';

/**
 * Calculate the duration between two dates in days
 */
export function calculateDuration(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0;
  return Math.max(0, differenceInDays(endOfDay(end), startOfDay(start)) + 1);
}

/**
 * Calculate the duration between two dates in working days
 */
export function calculateWorkingDuration(start: Date | null, end: Date | null): number {
  if (!start || !end) return 0;
  return workingCalendarService.getWorkingDaysBetween(start, end);
}

/**
 * Get the earliest date from an array of dates
 */
export function getEarliestDate(dates: (Date | null)[]): Date | null {
  const validDates = dates.filter((d): d is Date => d !== null);
  if (validDates.length === 0) return null;
  return min(validDates);
}

/**
 * Get the latest date from an array of dates
 */
export function getLatestDate(dates: (Date | null)[]): Date | null {
  const validDates = dates.filter((d): d is Date => d !== null);
  if (validDates.length === 0) return null;
  return max(validDates);
}

/**
 * Generate date markers for the timeline axis
 * Automatically switches between day and week view based on zoom level
 */
export function generateDateMarkers(
  start: Date,
  end: Date,
  showWorkingDaysOnly: boolean,
  dayWidth: number,
  zoomLevel: number = 1
): DateMarker[] {
  // Switch to week view when zoomed out (below 100%)
  const useWeekView = zoomLevel < 1;
  
  if (useWeekView) {
    return generateWeekMarkers(start, end, dayWidth);
  }
  
  const allDates = eachDayOfInterval({ start, end });
  
  // Filter to working days if requested
  const dates = showWorkingDaysOnly 
    ? workingCalendarService.filterToWorkingDays(allDates)
    : allDates;
  
  return dates.map((date, index) => ({
    date,
    position: index * dayWidth,
    label: format(date, 'dd MMM'),
    isToday: isToday(date),
    isWeekend: !workingCalendarService.isWorkingDay(date),
    isHoliday: workingCalendarService.isHoliday(date),
  }));
}

/**
 * Generate week markers for zoomed-out view
 */
function generateWeekMarkers(
  start: Date,
  end: Date,
  dayWidth: number
): DateMarker[] {
  const allDates = eachDayOfInterval({ start, end });
  const markers: DateMarker[] = [];
  let weekStart = start;
  let weekIndex = 0;
  
  for (let i = 0; i < allDates.length; i++) {
    const currentDate = allDates[i];
    const dayOfWeek = currentDate.getDay();
    
    // Start of week (Monday) or first day
    if (dayOfWeek === 1 || i === 0) {
      weekStart = currentDate;
    }
    
    // End of week (Sunday) or last day
    if (dayOfWeek === 0 || i === allDates.length - 1) {
      const weekEnd = currentDate;
      const position = differenceInDays(startOfDay(weekStart), startOfDay(start)) * dayWidth;
      
      // Check if this week contains today
      const today = new Date();
      const containsToday = weekStart <= today && today <= weekEnd;
      
      markers.push({
        date: weekStart,
        position,
        label: `${format(weekStart, 'dd MMM')} - ${format(weekEnd, 'dd MMM')}`,
        isToday: containsToday,
        isWeekend: false,
        isHoliday: false,
      });
      
      weekIndex++;
    }
  }
  
  return markers;
}

/**
 * Calculate the position of a date relative to the timeline start
 */
export function getDatePosition(
  date: Date,
  timelineStart: Date,
  showWorkingDaysOnly: boolean,
  dayWidth: number
): number {
  if (showWorkingDaysOnly) {
    const workingDays = workingCalendarService.getWorkingDaysBetween(timelineStart, date);
    return workingDays * dayWidth;
  }
  
  const days = differenceInDays(startOfDay(date), startOfDay(timelineStart));
  return days * dayWidth;
}

/**
 * Calculate bar width based on duration
 */
export function getBarWidth(
  start: Date | null,
  end: Date | null,
  showWorkingDaysOnly: boolean,
  dayWidth: number
): number {
  if (!start || !end) return 0;
  
  const duration = showWorkingDaysOnly
    ? calculateWorkingDuration(start, end)
    : calculateDuration(start, end);
  
  return Math.max(dayWidth, duration * dayWidth); // Minimum 1 day width
}

/**
 * Calculate timeline bounds from all items
 */
export function calculateTimelineBounds(
  items: Array<{ plannedStart: Date | null; plannedEnd: Date | null; actualStart?: Date | null; actualEnd?: Date | null }>,
  events: Array<{ startDate: Date; endDate: Date }> = []
): { start: Date; end: Date } | null {
  const allDates: Date[] = [];
  
  // Collect all dates from items
  items.forEach(item => {
    if (item.plannedStart) allDates.push(item.plannedStart);
    if (item.plannedEnd) allDates.push(item.plannedEnd);
    if (item.actualStart) allDates.push(item.actualStart);
    if (item.actualEnd) allDates.push(item.actualEnd);
  });
  
  // Collect all dates from events
  events.forEach(event => {
    allDates.push(event.startDate);
    allDates.push(event.endDate);
  });
  
  if (allDates.length === 0) return null;
  
  const start = min(allDates);
  const end = max(allDates);
  
  // Add 7 days padding on each side for better visualization
  return {
    start: addDays(start, -7),
    end: addDays(end, 7),
  };
}

/**
 * Check if a date is overdue
 */
export function isOverdue(date: Date | null): boolean {
  if (!date) return false;
  const today = startOfDay(new Date());
  return startOfDay(date) < today;
}

/**
 * Format date for display in UK format
 */
export function formatDateForDisplay(date: Date | null): string {
  if (!date) return '';
  return format(date, 'dd/MM/yyyy');
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return 'No dates';
  if (!start) return `Until ${formatDateForDisplay(end)}`;
  if (!end) return `From ${formatDateForDisplay(start)}`;
  return `${formatDateForDisplay(start)} - ${formatDateForDisplay(end)}`;
}

/**
 * Calculate position of "Today" line
 */
export function getTodayPosition(
  timelineStart: Date,
  showWorkingDaysOnly: boolean,
  dayWidth: number
): number {
  const today = new Date();
  return getDatePosition(today, timelineStart, showWorkingDaysOnly, dayWidth);
}

/**
 * Snap date to working day (if in working days mode)
 */
export function snapToWorkingDay(date: Date, showWorkingDaysOnly: boolean): Date {
  if (!showWorkingDaysOnly) return date;
  
  if (workingCalendarService.isWorkingDay(date)) {
    return date;
  }
  
  // Find next working day
  let nextDate = addDays(date, 1);
  let attempts = 0;
  while (!workingCalendarService.isWorkingDay(nextDate) && attempts < 14) {
    nextDate = addDays(nextDate, 1);
    attempts++;
  }
  
  return nextDate;
}

export const dateCalculationService = {
  calculateDuration,
  calculateWorkingDuration,
  getEarliestDate,
  getLatestDate,
  generateDateMarkers,
  getDatePosition,
  getBarWidth,
  calculateTimelineBounds,
  isOverdue,
  formatDateForDisplay,
  formatDateRange,
  getTodayPosition,
  snapToWorkingDay,
  isWeekend: (date: Date) => workingCalendarService.isWeekend(date),
  getWorkingDaysBetween: (start: Date, end: Date) => workingCalendarService.getWorkingDaysBetween(start, end),
};
