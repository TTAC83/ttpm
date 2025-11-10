import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';

interface UseDateTimeFieldProps {
  form: UseFormReturn<any>;
  dateName: string;
  timeName: string;
  hasTimeName: string;
}

/**
 * Hook to manage date/time field state with proper clear functionality
 */
export function useDateTimeField({ form, dateName, timeName, hasTimeName }: UseDateTimeFieldProps) {
  const handleClear = useCallback(() => {
    form.setValue(dateName, undefined);
    form.setValue(timeName, '');
    form.setValue(hasTimeName, false);
  }, [form, dateName, timeName, hasTimeName]);

  const handleDateChange = useCallback((date: Date | undefined) => {
    form.setValue(dateName, date);
  }, [form, dateName]);

  const handleTimeChange = useCallback((time: string) => {
    form.setValue(timeName, time);
    form.setValue(hasTimeName, time !== '');
  }, [form, timeName, hasTimeName]);

  return {
    handleClear,
    handleDateChange,
    handleTimeChange,
  };
}
