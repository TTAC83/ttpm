/**
 * Utilities for transforming date/time data between UI and database formats
 */

export interface DateTimeValue {
  date: Date | undefined;
  time: string;
  hasTime: boolean;
}

/**
 * Parse a timestamp string into date, time, and hasTime flag
 */
export function parseDateTime(timestamp: string | null | undefined): DateTimeValue {
  if (!timestamp) {
    return { date: undefined, time: '', hasTime: false };
  }

  const date = new Date(timestamp);
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  
  // If midnight, assume date-only
  const hasTime = hours !== 0 || minutes !== 0;
  
  const time = hasTime 
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
    : '';

  return { date, time, hasTime };
}

/**
 * Format date and time into ISO timestamp string
 */
export function formatDateTime(date: Date | undefined, time: string, hasTime: boolean): string | null {
  if (!date) return null;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  if (!hasTime || !time) {
    // Date only - store as midnight UTC
    return `${year}-${month}-${day}T00:00:00.000Z`;
  }

  const [hours, minutes] = time.split(':');
  return `${year}-${month}-${day}T${hours}:${minutes}:00.000Z`;
}

/**
 * Prepare form data for database submission
 */
export function transformFormData(data: any) {
  return {
    ...data,
    product_run_start: formatDateTime(
      data.product_run_start,
      data.product_run_start_time,
      data.product_run_start_has_time
    ),
    product_run_end: formatDateTime(
      data.product_run_end,
      data.product_run_end_time,
      data.product_run_end_has_time
    ),
    // Remove temporary UI fields
    product_run_start_time: undefined,
    product_run_end_time: undefined,
  };
}
