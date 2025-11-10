import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { parseDateTime } from '../utils/dateTimeTransform';

const visionModelSchema = z.object({
  line_name: z.string().min(1, 'Line name is required'),
  position: z.string().min(1, 'Position is required'),
  equipment: z.string().min(1, 'Equipment is required'),
  product_sku: z.string().optional(),
  product_title: z.string().optional(),
  use_case: z.string().optional(),
  group_name: z.string().optional(),
  status: z.enum(['Footage Required', 'Annotation Required', 'Processing Required', 'Validation Required', 'Deployment Required', 'Complete']),
  product_run_start: z.date().optional(),
  product_run_start_time: z.string().optional(),
  product_run_start_has_time: z.boolean().default(false),
  product_run_end: z.date().optional(),
  product_run_end_time: z.string().optional(),
  product_run_end_has_time: z.boolean().default(false),
});

export type VisionModelFormData = z.infer<typeof visionModelSchema>;

interface UseVisionModelFormProps {
  model?: any;
  open: boolean;
  projectType: 'implementation' | 'solutions';
}

/**
 * Hook to manage vision model form state and data loading
 */
export function useVisionModelForm({ model, open, projectType }: UseVisionModelFormProps) {
  const form = useForm<VisionModelFormData>({
    resolver: zodResolver(visionModelSchema),
    defaultValues: {
      line_name: '',
      position: '',
      equipment: '',
      product_sku: '',
      product_title: '',
      use_case: '',
      group_name: '',
      status: 'Footage Required',
      product_run_start: undefined,
      product_run_start_time: '',
      product_run_start_has_time: false,
      product_run_end: undefined,
      product_run_end_time: '',
      product_run_end_has_time: false,
    },
  });

  // Load model data when editing
  useEffect(() => {
    if (!open) {
      form.reset();
      return;
    }

    if (model) {
      const startDateTime = parseDateTime(model.product_run_start);
      const endDateTime = parseDateTime(model.product_run_end);

      form.reset({
        line_name: model.line_name || '',
        position: model.position || '',
        equipment: model.equipment || '',
        product_sku: model.product_sku || '',
        product_title: model.product_title || '',
        use_case: model.use_case || '',
        group_name: model.group_name || '',
        status: model.status || 'Footage Required',
        product_run_start: startDateTime.date,
        product_run_start_time: startDateTime.time,
        product_run_start_has_time: startDateTime.hasTime,
        product_run_end: endDateTime.date,
        product_run_end_time: endDateTime.time,
        product_run_end_has_time: endDateTime.hasTime,
      });
    }
  }, [open, model, form]);

  return form;
}
