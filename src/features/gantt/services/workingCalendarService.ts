/**
 * Working calendar service - handles business days, weekends, and holidays
 * Integrates with Supabase add_working_days RPC function
 */

import { addDays, isSameDay, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toISODateString } from '@/lib/dateUtils';

export class WorkingCalendarService {
  private holidaysCache: Date[] = [];
  private cacheLoaded = false;
  private cachePromise: Promise<void> | null = null;

  /**
   * Load holidays from database (or use default UK bank holidays)
   * Caches results for performance
   */
  async loadHolidays(): Promise<void> {
    if (this.cacheLoaded) return;
    if (this.cachePromise) return this.cachePromise;

    this.cachePromise = (async () => {
      try {
        // TODO: When holidays table is created, uncomment this:
        // const { data, error } = await supabase
        //   .from('holidays')
        //   .select('date')
        //   .order('date');
        // 
        // if (!error && data) {
        //   this.holidaysCache = data.map(h => new Date(h.date));
        // } else {
        //   this.holidaysCache = this.getDefaultUKBankHolidays();
        // }

        // For now, use default UK bank holidays
        this.holidaysCache = this.getDefaultUKBankHolidays();
        this.cacheLoaded = true;
      } catch (error) {
        console.error('Error loading holidays:', error);
        this.holidaysCache = this.getDefaultUKBankHolidays();
        this.cacheLoaded = true;
      }
    })();

    return this.cachePromise;
  }

  /**
   * Get default UK bank holidays for current year + next year
   */
  private getDefaultUKBankHolidays(): Date[] {
    const currentYear = new Date().getFullYear();
    return [
      // 2025
      new Date(2025, 0, 1),  // New Year's Day
      new Date(2025, 3, 18), // Good Friday
      new Date(2025, 3, 21), // Easter Monday
      new Date(2025, 4, 5),  // Early May Bank Holiday
      new Date(2025, 4, 26), // Spring Bank Holiday
      new Date(2025, 7, 25), // Summer Bank Holiday
      new Date(2025, 11, 25), // Christmas Day
      new Date(2025, 11, 26), // Boxing Day
      
      // 2026
      new Date(2026, 0, 1),  // New Year's Day
      new Date(2026, 3, 3),  // Good Friday
      new Date(2026, 3, 6),  // Easter Monday
      new Date(2026, 4, 4),  // Early May Bank Holiday
      new Date(2026, 4, 25), // Spring Bank Holiday
      new Date(2026, 7, 31), // Summer Bank Holiday
      new Date(2026, 11, 25), // Christmas Day
      new Date(2026, 11, 28), // Boxing Day (substitute)
    ].filter(date => date.getFullYear() >= currentYear);
  }

  /**
   * Check if a date is a weekend
   */
  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  /**
   * Check if a date is a working day (not weekend, not holiday)
   */
  isWorkingDay(date: Date): boolean {
    // Weekend check
    if (this.isWeekend(date)) return false;
    
    // Holiday check
    return !this.isHoliday(date);
  }

  /**
   * Check if a date is a holiday
   */
  isHoliday(date: Date): boolean {
    return this.holidaysCache.some(h => isSameDay(h, date));
  }

  /**
   * Get number of working days between two dates (inclusive)
   */
  getWorkingDaysBetween(start: Date, end: Date): number {
    if (start > end) return 0;
    
    let count = 0;
    let current = new Date(start);
    const endDate = new Date(end);
    
    while (current <= endDate) {
      if (this.isWorkingDay(current)) {
        count++;
      }
      current = addDays(current, 1);
    }
    
    return count;
  }

  /**
   * Filter an array of dates to only working days
   */
  filterToWorkingDays(dates: Date[]): Date[] {
    return dates.filter(d => this.isWorkingDay(d));
  }

  /**
   * Add working days to a date (uses Supabase RPC for accuracy)
   */
  async addWorkingDays(startDate: Date, days: number): Promise<Date> {
    try {
      const { data, error } = await supabase.rpc('add_working_days', {
        start_date: toISODateString(startDate),
        n: days
      });
      
      if (error) throw error;
      return new Date(data);
    } catch (error) {
      console.error('Error calculating working days via RPC, using fallback:', error);
      return this.addWorkingDaysFallback(startDate, days);
    }
  }

  /**
   * Fallback method to add working days (client-side calculation)
   */
  private addWorkingDaysFallback(startDate: Date, days: number): Date {
    let current = new Date(startDate);
    let remaining = days;
    
    while (remaining > 0) {
      current = addDays(current, 1);
      if (this.isWorkingDay(current)) {
        remaining--;
      }
    }
    
    return current;
  }

  /**
   * Get next working day from a given date
   */
  getNextWorkingDay(date: Date): Date {
    let next = addDays(date, 1);
    while (!this.isWorkingDay(next)) {
      next = addDays(next, 1);
    }
    return next;
  }

  /**
   * Get previous working day from a given date
   */
  getPreviousWorkingDay(date: Date): Date {
    let prev = addDays(date, -1);
    while (!this.isWorkingDay(prev)) {
      prev = addDays(prev, -1);
    }
    return prev;
  }

  /**
   * Clear the holidays cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.holidaysCache = [];
    this.cacheLoaded = false;
    this.cachePromise = null;
  }
}

// Export singleton instance
export const workingCalendarService = new WorkingCalendarService();
