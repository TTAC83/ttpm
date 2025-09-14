import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listWeeks, WeekOption } from '@/lib/bauWeeklyService';
import { Skeleton } from '@/components/ui/skeleton';

interface WeekSelectorProps {
  selectedWeek: WeekOption | null;
  onWeekChange: (week: WeekOption) => void;
}

export const WeekSelector: React.FC<WeekSelectorProps> = ({
  selectedWeek,
  onWeekChange
}) => {
  const { data: weeks, isLoading, error } = useQuery({
    queryKey: ['bau-weeks'],
    queryFn: listWeeks,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-64" />;
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Error loading weeks: {error.message}
      </div>
    );
  }

  if (!weeks || weeks.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No weekly data available
      </div>
    );
  }

  const handleValueChange = (value: string) => {
    const week = weeks.find(w => `${w.date_from}-${w.date_to}` === value);
    if (week) {
      onWeekChange(week);
    }
  };

  const selectedValue = selectedWeek ? `${selectedWeek.date_from}-${selectedWeek.date_to}` : '';

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Select Week</label>
      <Select value={selectedValue} onValueChange={handleValueChange}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Choose a week..." />
        </SelectTrigger>
        <SelectContent>
          {weeks.map((week) => (
            <SelectItem 
              key={`${week.date_from}-${week.date_to}`} 
              value={`${week.date_from}-${week.date_to}`}
            >
              {week.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};