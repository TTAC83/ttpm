import { startOfWeek, addWeeks, subWeeks, format, isBefore, isAfter } from 'date-fns';

export interface GeneratedWeek {
  week_start: string;
  week_end: string;
  available_at: string;
  isCurrentWeek: boolean;
  isFutureWeek: boolean;
}

/**
 * Gets the Monday of a given week (UK timezone aware)
 */
export function getMondayOfWeek(date: Date): Date {
  // startOfWeek with weekStartsOn: 1 gives us Monday
  return startOfWeek(date, { weekStartsOn: 1 });
}

/**
 * Dynamically generates week data based on the current date.
 * Returns the current week and optionally historical weeks.
 * 
 * @param includeHistoricalCount - Number of past weeks to include (default: 4 recent weeks)
 * @param includeFutureCount - Number of future weeks to include (default: 0)
 */
export function generateAvailableWeeks(
  includeHistoricalCount: number = 4,
  includeFutureCount: number = 0
): GeneratedWeek[] {
  const now = new Date();
  const currentMonday = getMondayOfWeek(now);
  
  const weeks: GeneratedWeek[] = [];
  
  // Add future weeks (if any)
  for (let i = includeFutureCount; i > 0; i--) {
    const monday = addWeeks(currentMonday, i);
    weeks.push(createWeekObject(monday, currentMonday));
  }
  
  // Add current week
  weeks.push(createWeekObject(currentMonday, currentMonday));
  
  // Add historical weeks
  for (let i = 1; i <= includeHistoricalCount; i++) {
    const monday = subWeeks(currentMonday, i);
    weeks.push(createWeekObject(monday, currentMonday));
  }
  
  return weeks;
}

/**
 * Creates a week object from a Monday date
 */
function createWeekObject(monday: Date, currentMonday: Date): GeneratedWeek {
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  
  // available_at is Monday at 00:01 UTC
  const availableAt = new Date(monday);
  availableAt.setHours(0, 1, 0, 0);
  
  const isCurrentWeek = monday.getTime() === currentMonday.getTime();
  const isFutureWeek = isAfter(monday, currentMonday);
  
  return {
    week_start: format(monday, 'yyyy-MM-dd'),
    week_end: format(sunday, 'yyyy-MM-dd'),
    available_at: availableAt.toISOString(),
    isCurrentWeek,
    isFutureWeek
  };
}

/**
 * Gets all weeks that have historical data in the database
 * Combined with dynamic weeks for a complete view
 */
export async function getWeeksWithData(
  supabase: any,
  dynamicWeeks: GeneratedWeek[],
  tableName: string = 'impl_weekly_reviews'
): Promise<string[]> {
  // Get unique week_start values from reviews
  const { data, error } = await supabase
    .from(tableName)
    .select('week_start')
    .order('week_start', { ascending: false });
  
  if (error) {
    console.error('Error fetching weeks with data:', error);
    return dynamicWeeks.map(w => w.week_start);
  }
  
  // Get unique week_starts from DB
  const dbWeeks = new Set((data || []).map((r: any) => r.week_start));
  
  // Combine with dynamic weeks
  const dynamicWeekStarts = new Set(dynamicWeeks.map(w => w.week_start));
  
  return Array.from(new Set([...dynamicWeekStarts, ...dbWeeks]))
    .sort()
    .reverse() as string[];
}

/**
 * Format a week for display
 */
export function formatWeekLabel(weekStart: string): string {
  const date = new Date(weekStart + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Europe/London'
  });
}

/**
 * Get the current week's Monday as ISO string
 */
export function getCurrentWeekStart(): string {
  const currentMonday = getMondayOfWeek(new Date());
  return format(currentMonday, 'yyyy-MM-dd');
}
