import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useVisionModelForm } from './hooks/useVisionModelForm';
import { useLineEquipmentCascade } from './hooks/useLineEquipmentCascade';
import { useDateTimeField } from './hooks/useDateTimeField';
import { transformFormData } from './utils/dateTimeTransform';
import { DateTimeField } from './components/DateTimeField';
import { EquipmentSelectors } from './components/EquipmentSelectors';
import { modelUsesFk } from '@/lib/visionModelsService';

interface VisionModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  projectId: string;
  model?: any;
  mode: 'create' | 'edit' | 'view';
  projectType?: 'implementation' | 'solutions';
}

export function VisionModelDialog({
  open,
  onOpenChange,
  onClose,
  projectId,
  model,
  mode,
  projectType = 'implementation',
}: VisionModelDialogProps) {
  const [loading, setLoading] = useState(false);
  const form = useVisionModelForm({ model, open, projectType });
  const { lines, positions, equipment, cameras, loading: cascadeLoading } = useLineEquipmentCascade({
    form,
    projectId,
    projectType,
    open,
  });

  const startDateTime = useDateTimeField({
    form,
    dateName: 'product_run_start',
    timeName: 'product_run_start_time',
    hasTimeName: 'product_run_start_has_time',
  });

  const endDateTime = useDateTimeField({
    form,
    dateName: 'product_run_end',
    timeName: 'product_run_end_time',
    hasTimeName: 'product_run_end_has_time',
  });

  // Check if this is a legacy record (has text fields but no FK fields)
  const isLegacyRecord = model && !modelUsesFk(model) && (model.line_name || model.position || model.equipment);

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      const transformedData = transformFormData(data);
      const projectColumn = projectType === 'solutions' ? 'solutions_project_id' : 'project_id';

      // Build payload with FK fields
      const payload: any = {
        [projectColumn]: projectId,
        ...transformedData,
        // Include FK fields
        line_id: data.line_id || null,
        solutions_line_id: data.solutions_line_id || null,
        position_id: data.position_id || null,
        equipment_id: data.equipment_id || null,
        camera_id: data.camera_id || null,
        // Include text fields for display/search
        line_name: data.line_name,
        position: data.position,
        equipment: data.equipment,
      };

      if (mode === 'edit' && model?.id) {
        const { error } = await supabase
          .from('vision_models')
          .update(payload)
          .eq('id', model.id);

        if (error) throw error;
        toast.success('Vision model updated successfully');
      } else {
        const { error } = await supabase
          .from('vision_models')
          .insert([payload]);

        if (error) throw error;
        toast.success('Vision model created successfully');
      }

      onClose();
    } catch (error: any) {
      console.error('Error saving vision model:', error);
      toast.error(error.message || 'Failed to save vision model');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    if (mode === 'view') return 'View Vision Model';
    if (mode === 'edit') return 'Edit Vision Model';
    return 'Create New Vision Model';
  };

  const getDescription = () => {
    if (mode === 'view') return 'View the details of this vision model.';
    if (mode === 'edit') return 'Update the details of this vision model.';
    return 'Add a new vision model to track its progress through the pipeline.';
  };

  const isDisabled = mode === 'view';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <EquipmentSelectors
              form={form}
              lines={lines}
              positions={positions}
              equipment={equipment}
              cameras={cameras}
              disabled={isDisabled}
              projectType={projectType}
              isLegacyRecord={isLegacyRecord}
            />

            <FormField
              control={form.control}
              name="product_sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product SKU</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isDisabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Title</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isDisabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="use_case"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Use Case</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isDisabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="group_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ""} disabled={isDisabled} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select disabled={isDisabled} onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Footage Required">Footage Required</SelectItem>
                      <SelectItem value="Annotation Required">Annotation Required</SelectItem>
                      <SelectItem value="Processing Required">Processing Required</SelectItem>
                      <SelectItem value="Validation Required">Validation Required</SelectItem>
                      <SelectItem value="Deployment Required">Deployment Required</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DateTimeField
              label="Product Run Start"
              date={form.watch('product_run_start')}
              time={form.watch('product_run_start_time')}
              hasTime={form.watch('product_run_start_has_time')}
              onDateChange={startDateTime.handleDateChange}
              onTimeChange={startDateTime.handleTimeChange}
              onClear={startDateTime.handleClear}
              disabled={isDisabled}
            />

            <DateTimeField
              label="Product Run End"
              date={form.watch('product_run_end')}
              time={form.watch('product_run_end_time')}
              hasTime={form.watch('product_run_end_has_time')}
              onDateChange={endDateTime.handleDateChange}
              onTimeChange={endDateTime.handleTimeChange}
              onClear={endDateTime.handleClear}
              disabled={isDisabled}
            />

            {mode !== 'view' && (
              <DialogFooter>
                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading || cascadeLoading}>
                  {loading ? 'Saving...' : mode === 'edit' ? 'Update' : 'Create'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}