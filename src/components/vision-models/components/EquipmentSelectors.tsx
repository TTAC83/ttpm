import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UseFormReturn } from 'react-hook-form';
import { VisionModelFormData } from '../hooks/useVisionModelForm';
import { CascadeOption, CameraOption } from '../hooks/useLineEquipmentCascade';
import { AlertTriangle } from 'lucide-react';

interface EquipmentSelectorsProps {
  form: UseFormReturn<VisionModelFormData>;
  lines: CascadeOption[];
  positions: CascadeOption[];
  equipment: CascadeOption[];
  cameras?: CameraOption[];
  disabled?: boolean;
  projectType: 'implementation' | 'solutions';
  isLegacyRecord?: boolean;
}

/**
 * Cascading line -> position -> equipment -> camera selectors
 * Now uses FK IDs while maintaining legacy text fields for backward compatibility
 */
export function EquipmentSelectors({
  form,
  lines,
  positions,
  equipment,
  cameras = [],
  disabled = false,
  projectType,
  isLegacyRecord = false,
}: EquipmentSelectorsProps) {
  const lineIdField = projectType === 'solutions' ? 'solutions_line_id' : 'line_id';
  const currentLineId = form.watch(lineIdField as any);
  const currentPositionId = form.watch('position_id');
  const currentEquipmentId = form.watch('equipment_id');

  // Handler for line selection - updates both FK and text field
  const handleLineChange = (lineId: string) => {
    const selectedLine = lines.find(l => l.value === lineId);
    if (selectedLine) {
      // Set FK
      if (projectType === 'solutions') {
        form.setValue('solutions_line_id', lineId);
        form.setValue('line_id', null);
      } else {
        form.setValue('line_id', lineId);
        form.setValue('solutions_line_id', null);
      }
      // Set legacy text field
      form.setValue('line_name', selectedLine.name);
      // Clear dependent fields
      form.setValue('position_id', null);
      form.setValue('position', '');
      form.setValue('equipment_id', null);
      form.setValue('equipment', '');
      form.setValue('camera_id', null);
    }
  };

  // Handler for position selection
  const handlePositionChange = (positionId: string) => {
    const selectedPosition = positions.find(p => p.value === positionId);
    if (selectedPosition) {
      form.setValue('position_id', positionId);
      form.setValue('position', selectedPosition.name);
      // Clear dependent fields
      form.setValue('equipment_id', null);
      form.setValue('equipment', '');
      form.setValue('camera_id', null);
    }
  };

  // Handler for equipment selection
  const handleEquipmentChange = (equipmentId: string) => {
    const selectedEquipment = equipment.find(e => e.value === equipmentId);
    if (selectedEquipment) {
      form.setValue('equipment_id', equipmentId);
      form.setValue('equipment', selectedEquipment.name);
      form.setValue('camera_id', null);
    }
  };

  // Handler for camera selection
  const handleCameraChange = (cameraId: string) => {
    form.setValue('camera_id', cameraId);
  };

  return (
    <>
      {isLegacyRecord && (
        <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-md mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-600 dark:text-amber-400">
            <strong>Legacy record:</strong> This vision model uses text-based references. 
            Re-selecting line/position/equipment will upgrade it to use proper database links.
          </div>
        </div>
      )}

      <FormField
        control={form.control}
        name={lineIdField as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Line Name</FormLabel>
            <Select
              disabled={disabled}
              onValueChange={handleLineChange}
              value={field.value || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a line">
                    {field.value 
                      ? lines.find(l => l.value === field.value)?.label 
                      : form.watch('line_name') || 'Select a line'}
                  </SelectValue>
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
        name="position_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Position</FormLabel>
            <Select
              disabled={disabled || !currentLineId || positions.length === 0}
              onValueChange={handlePositionChange}
              value={field.value || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a position">
                    {field.value 
                      ? positions.find(p => p.value === field.value)?.label 
                      : form.watch('position') || 'Select a position'}
                  </SelectValue>
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
        name="equipment_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Equipment</FormLabel>
            <Select
              disabled={disabled || !currentPositionId || equipment.length === 0}
              onValueChange={handleEquipmentChange}
              value={field.value || ''}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select equipment">
                    {field.value 
                      ? equipment.find(e => e.value === field.value)?.label 
                      : form.watch('equipment') || 'Select equipment'}
                  </SelectValue>
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

      {cameras.length > 0 && (
        <FormField
          control={form.control}
          name="camera_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Camera (Optional)</FormLabel>
              <Select
                disabled={disabled || !currentEquipmentId}
                onValueChange={handleCameraChange}
                value={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a camera (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">No camera selected</SelectItem>
                  {cameras.map((camera) => (
                    <SelectItem key={camera.value} value={camera.value}>
                      {camera.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
}