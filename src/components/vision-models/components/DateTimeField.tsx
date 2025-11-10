import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface DateTimeFieldProps {
  label: string;
  date: Date | undefined;
  time: string;
  hasTime: boolean;
  onDateChange: (date: Date | undefined) => void;
  onTimeChange: (time: string) => void;
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Reusable date/time picker field component
 */
export function DateTimeField({
  label,
  date,
  time,
  hasTime,
  onDateChange,
  onTimeChange,
  onClear,
  disabled = false,
}: DateTimeFieldProps) {
  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>
      <div className="flex gap-2 items-start">
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant="outline"
                className={cn(
                  'w-[240px] pl-3 text-left font-normal',
                  !date && 'text-muted-foreground'
                )}
                disabled={disabled}
              >
                {date ? format(date, 'PPP') : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={onDateChange}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>

        <Input
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          className="w-[120px]"
          disabled={disabled || !date}
          placeholder="HH:MM"
        />

        {date && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/90"
            onClick={onClear}
            disabled={disabled}
          >
            <span className="sr-only">Clear date</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </Button>
        )}
      </div>
      <FormMessage />
    </FormItem>
  );
}
