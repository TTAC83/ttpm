import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { VisionModelFormData } from '../hooks/useVisionModelForm';

interface EquipmentSelectorsProps {
  form: UseFormReturn<VisionModelFormData>;
  lines: Array<{ value: string; label: string }>;
  positions: Array<{ value: string; label: string }>;
  equipment: Array<{ value: string; label: string }>;
  disabled?: boolean;
}

/**
 * Cascading line -> position -> equipment selectors
 */
export function EquipmentSelectors({
  form,
  lines,
  positions,
  equipment,
  disabled = false,
}: EquipmentSelectorsProps) {
  return (
    <>
      <FormField
        control={form.control}
        name="line_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Line Name</FormLabel>
            <Select
              disabled={disabled}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue('position', '');
                form.setValue('equipment', '');
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a line" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {lines.map((line) => (
                  <SelectItem key={line.value} value={line.value}>
                    {line.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="position"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Position</FormLabel>
            <Select
              disabled={disabled || !form.watch('line_name') || positions.length === 0}
              onValueChange={(value) => {
                field.onChange(value);
                form.setValue('equipment', '');
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a position" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="equipment"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Equipment</FormLabel>
            <Select
              disabled={disabled || !form.watch('position') || equipment.length === 0}
              onValueChange={field.onChange}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {equipment.map((eq) => (
                  <SelectItem key={eq.value} value={eq.value}>
                    {eq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
}
