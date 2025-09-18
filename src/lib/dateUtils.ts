// Date formatting utilities for UK/Europe locale
export const formatDateUK = (date: string | Date | null): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/London'
  });
};

export const formatDateTimeUK = (date: string | Date | null): string => {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London'
  });
};

export const parseUKDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  // Handle DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  
  // Fallback to standard parsing
  return new Date(dateStr);
};

export const toISODateString = (date: Date | null): string => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const addWorkingDays = async (startDate: Date, days: number, supabase: any): Promise<Date> => {
  try {
    const { data, error } = await supabase.rpc('add_working_days', {
      start_date: toISODateString(startDate),
      n: days
    });
    
    if (error) throw error;
    return new Date(data);
  } catch (error) {
    console.error('Error calculating working days:', error);
    // Fallback: simple addition (not accounting for weekends/holidays)
    const result = new Date(startDate);
    result.setDate(result.getDate() + days);
    return result;
  }
};