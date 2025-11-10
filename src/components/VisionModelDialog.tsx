import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const visionModelSchema = z.object({
  line_name: z.string().min(1, 'Line is required'),
  position: z.string().min(1, 'Position is required'),
  equipment: z.string().min(1, 'Equipment is required'),
  product_sku: z.string().min(1, 'Product SKU is required'),
  product_title: z.string().min(1, 'Product Title is required'),
  use_case: z.string().min(1, 'Use Case is required'),
  group_name: z.string().optional(),
  start_date: z.date().optional(),
  start_time: z.string().optional(),
  end_date: z.date().optional(),
  end_time: z.string().optional(),
  product_run_start: z.date().optional(),
  product_run_start_time: z.string().optional(),
  product_run_end: z.date().optional(),
  product_run_end_time: z.string().optional(),
  status: z.enum(['Footage Required', 'Annotation Required', 'Processing Required', 'Deployment Required', 'Validation Required', 'Complete']),
});

type VisionModelFormData = z.infer<typeof visionModelSchema>;

interface VisionModel {
  id: string;
  project_id: string;
  line_name: string;
  position: string;
  equipment: string;
  product_sku: string;
  product_title: string;
  use_case: string;
  group_name?: string;
  start_date: string | null;
  end_date: string | null;
  product_run_start: string | null;
  product_run_start_has_time?: boolean;
  product_run_end: string | null;
  product_run_end_has_time?: boolean;
  status: 'Footage Required' | 'Annotation Required' | 'Processing Required' | 'Deployment Required' | 'Validation Required' | 'Complete';
  created_at: string;
  updated_at: string;
}

interface VisionModelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  projectId: string;
  projectType?: 'implementation' | 'solutions';
  model?: VisionModel | null;
  mode: 'view' | 'edit' | 'create';
}

export function VisionModelDialog({ 
  open, 
  onOpenChange, 
  onClose, 
  projectId,
  projectType = 'implementation',
  model, 
  mode 
}: VisionModelDialogProps) {
  const [loading, setLoading] = useState(false);
  const [lines, setLines] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const { toast } = useToast();

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
    },
  });

  useEffect(() => {
    if (open) {
      loadLines();
    }
  }, [open, projectId]);

  const loadLines = async () => {
    try {
      if (projectType === 'solutions') {
        const { data, error } = await supabase
          .from('solutions_lines')
          .select('id, line_name')
          .eq('solutions_project_id', projectId)
          .order('line_name');

        if (error) throw error;
        setLines(data || []);
      } else {
        const { data, error } = await supabase
          .from('lines')
          .select('id, line_name')
          .eq('project_id', projectId)
          .order('line_name');

        if (error) throw error;
        setLines(data || []);
      }
    } catch (error) {
      console.error('Error loading lines:', error);
    }
  };

  const loadPositions = async (lineId: string) => {
    try {
      const { data, error } = await supabase
        .from('positions')
        .select('id, name')
        .eq('line_id', lineId)
        .order('name');

      if (error) throw error;
      setPositions(data || []);
    } catch (error) {
      console.error('Error loading positions:', error);
    }
  };

  const loadEquipment = async (positionId: string) => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          id, 
          name,
          cameras(id)
        `)
        .eq('position_id', positionId)
        .order('name');

      if (error) throw error;
      
      // Filter to only equipment that has cameras attached
      const equipmentWithCameras = (data || []).filter(eq => eq.cameras && eq.cameras.length > 0);
      setEquipment(equipmentWithCameras);
    } catch (error) {
      console.error('Error loading equipment:', error);
    }
  };

  useEffect(() => {
    if (model && (mode === 'edit' || mode === 'view')) {
      // Find the line ID from line name to load positions and equipment
      const selectedLine = lines.find(line => line.line_name === model.line_name);
      if (selectedLine) {
        loadPositions(selectedLine.id);
        // We'll need to load equipment after positions are loaded
      }

      // Helper to extract time from timestamp - only if has_time flag is true
      const extractTime = (dateStr: string | null, hasTime: boolean) => {
        if (!dateStr || !hasTime) return '';
        const d = new Date(dateStr);
        const hours = d.getUTCHours();
        const minutes = d.getUTCMinutes();
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      };

      form.reset({
        line_name: model.line_name,
        position: model.position,
        equipment: model.equipment,
        product_sku: model.product_sku,
        product_title: model.product_title,
        use_case: model.use_case,
        group_name: model.group_name || '',
        start_date: model.start_date ? new Date(model.start_date) : undefined,
        start_time: extractTime(model.start_date, true), // Assuming start_date always has time if set
        end_date: model.end_date ? new Date(model.end_date) : undefined,
        end_time: extractTime(model.end_date, true), // Assuming end_date always has time if set
        product_run_start: model.product_run_start ? new Date(model.product_run_start) : undefined,
        product_run_start_time: extractTime(model.product_run_start, model.product_run_start_has_time ?? false),
        product_run_end: model.product_run_end ? new Date(model.product_run_end) : undefined,
        product_run_end_time: extractTime(model.product_run_end, model.product_run_end_has_time ?? false),
        status: model.status,
      });
    } else if (mode === 'create') {
      form.reset({
        line_name: '',
        position: '',
        equipment: '',
        product_sku: '',
        product_title: '',
        use_case: '',
        group_name: '',
        status: 'Footage Required',
      });
      setPositions([]);
      setEquipment([]);
    }
  }, [model, mode, form, lines]);

  const onSubmit = async (data: VisionModelFormData) => {
    if (mode === 'view') return;

    try {
      setLoading(true);

      // Helper function to combine date and time
      const formatDateTime = (date?: Date, time?: string) => {
        if (!date) return null;
        const dateStr = date.toISOString().split('T')[0];
        if (time && time.trim()) {
          // User entered a time - save the timestamp
          return `${dateStr}T${time}:00.000Z`;
        }
        // No time provided - save as midnight
        return `${dateStr}T00:00:00.000Z`;
      };

      const formattedData: any = {
        ...(projectType === 'solutions' 
          ? { solutions_project_id: projectId, project_type: 'solutions' as const }
          : { project_id: projectId, project_type: 'implementation' as const }
        ),
        line_name: data.line_name,
        position: data.position,
        equipment: data.equipment,
        product_sku: data.product_sku,
        product_title: data.product_title,
        use_case: data.use_case,
        group_name: data.group_name || null,
        start_date: formatDateTime(data.start_date, data.start_time),
        end_date: formatDateTime(data.end_date, data.end_time),
        product_run_start: formatDateTime(data.product_run_start, data.product_run_start_time),
        product_run_start_has_time: !!(data.product_run_start_time && data.product_run_start_time.trim()),
        product_run_end: formatDateTime(data.product_run_end, data.product_run_end_time),
        product_run_end_has_time: !!(data.product_run_end_time && data.product_run_end_time.trim()),
        status: data.status,
      };

      if (mode === 'create') {
        const { error } = await supabase
          .from('vision_models')
          .insert([formattedData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vision model created successfully",
        });
      } else if (mode === 'edit' && model) {
        const { error } = await supabase
          .from('vision_models')
          .update(formattedData)
          .eq('id', model.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Vision model updated successfully",
        });
      }

      onClose();
    } catch (error: any) {
      console.error('Vision model error:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${mode === 'create' ? 'create' : 'update'} vision model`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'create': return 'Create Vision Model';
      case 'edit': return 'Edit Vision Model';
      case 'view': return 'View Vision Model';
      default: return 'Vision Model';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'create': return 'Add a new vision model to this project';
      case 'edit': return 'Make changes to this vision model';
      case 'view': return 'View details of this vision model';
      default: return '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="line_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Line</FormLabel>
                    <Select 
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear dependent fields
                        form.setValue('position', '');
                        form.setValue('equipment', '');
                        setPositions([]);
                        setEquipment([]);
                        // Load positions for selected line
                        const selectedLine = lines.find(line => line.line_name === value);
                        if (selectedLine) {
                          loadPositions(selectedLine.id);
                        }
                      }} 
                      value={field.value}
                      disabled={mode === 'view'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a line" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {lines.filter(line => line.line_name && line.line_name.trim() !== '').map((line) => (
                          <SelectItem key={line.id} value={line.line_name}>
                            {line.line_name}
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
                      onValueChange={(value) => {
                        field.onChange(value);
                        // Clear equipment field
                        form.setValue('equipment', '');
                        setEquipment([]);
                        // Load equipment for selected position
                        const selectedPosition = positions.find(pos => pos.name === value);
                        if (selectedPosition) {
                          loadEquipment(selectedPosition.id);
                        }
                      }} 
                      value={field.value}
                      disabled={mode === 'view' || positions.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={positions.length === 0 ? "Select a line first" : "Select a position"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {positions.filter(position => position.name && position.name.trim() !== '').map((position) => (
                          <SelectItem key={position.id} value={position.name}>
                            {position.name}
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
                      onValueChange={field.onChange} 
                      value={field.value}
                      disabled={mode === 'view' || equipment.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={equipment.length === 0 ? "No equipment with cameras available" : "Select equipment"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {equipment.filter(eq => eq.name && eq.name.trim() !== '').map((eq) => (
                          <SelectItem key={eq.id} value={eq.name}>
                            {eq.name}
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
                name="product_sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product SKU</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={mode === 'view'} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="product_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Title</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={mode === 'view'} />
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
                    <Textarea {...field} disabled={mode === 'view'} />
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
                  <FormLabel>Group (Optional)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={mode === 'view'} placeholder="e.g., UK-Beef, Pol-Chicken" />
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
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={mode === 'view'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Footage Required">Footage Required</SelectItem>
                      <SelectItem value="Annotation Required">Annotation Required</SelectItem>
                      <SelectItem value="Processing Required">Processing Required</SelectItem>
                      <SelectItem value="Deployment Required">Deployment Required</SelectItem>
                      <SelectItem value="Validation Required">Validation Required</SelectItem>
                      <SelectItem value="Complete">Complete</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => {
                  const timeValue = form.watch('start_time');
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "flex-1 pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={mode === 'view'}
                              >
                                {field.value ? (
                                  <>
                                    {format(field.value, "PPP")}
                                    {timeValue && timeValue.trim() && (
                                      <span className="ml-2 text-muted-foreground">at {timeValue}</span>
                                    )}
                                  </>
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={mode === 'view'}
                              initialFocus
                              className="pointer-events-auto"
                            />
                            <div className="p-3 border-t">
                              <FormField
                                control={form.control}
                                name="start_time"
                                render={({ field: timeField }) => (
                                   <div className="flex flex-col gap-2">
                                     <label className="text-sm font-medium">Time (Optional)</label>
                                     <Input 
                                       type="time" 
                                       {...timeField} 
                                       disabled={mode === 'view'}
                                       className="w-full"
                                       step="60"
                                     />
                                   </div>
                                )}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        {field.value && mode !== 'view' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => {
                              field.onChange(undefined);
                              form.setValue('start_time', '');
                            }}
                          >
                            <span className="sr-only">Clear date</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => {
                  const timeValue = form.watch('end_time');
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "flex-1 pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={mode === 'view'}
                              >
                                {field.value ? (
                                  <>
                                    {format(field.value, "PPP")}
                                    {timeValue && timeValue.trim() && (
                                      <span className="ml-2 text-muted-foreground">at {timeValue}</span>
                                    )}
                                  </>
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={mode === 'view'}
                              initialFocus
                              className="pointer-events-auto"
                            />
                            <div className="p-3 border-t">
                              <FormField
                                control={form.control}
                                name="end_time"
                                render={({ field: timeField }) => (
                                   <div className="flex flex-col gap-2">
                                     <label className="text-sm font-medium">Time (Optional)</label>
                                     <Input 
                                       type="time" 
                                       {...timeField} 
                                       disabled={mode === 'view'}
                                       className="w-full"
                                       step="60"
                                     />
                                   </div>
                                )}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        {field.value && mode !== 'view' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => {
                              field.onChange(undefined);
                              form.setValue('end_time', '');
                            }}
                          >
                            <span className="sr-only">Clear date</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="product_run_start"
                render={({ field }) => {
                  const timeValue = form.watch('product_run_start_time');
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Product Run Start</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "flex-1 pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={mode === 'view'}
                              >
                                {field.value ? (
                                  <>
                                    {format(field.value, "PPP")}
                                    {timeValue && timeValue.trim() && (
                                      <span className="ml-2 text-muted-foreground">at {timeValue}</span>
                                    )}
                                  </>
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={mode === 'view'}
                              initialFocus
                              className="pointer-events-auto"
                            />
                            <div className="p-3 border-t">
                              <FormField
                                control={form.control}
                                name="product_run_start_time"
                                render={({ field: timeField }) => (
                                   <div className="flex flex-col gap-2">
                                     <label className="text-sm font-medium">Time (Optional)</label>
                                     <Input 
                                       type="time" 
                                       {...timeField} 
                                       disabled={mode === 'view'}
                                       className="w-full"
                                       step="60"
                                     />
                                   </div>
                                )}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        {field.value && mode !== 'view' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => {
                              field.onChange(undefined);
                              form.setValue('product_run_start_time', '');
                            }}
                          >
                            <span className="sr-only">Clear date</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                control={form.control}
                name="product_run_end"
                render={({ field }) => {
                  const timeValue = form.watch('product_run_end_time');
                  return (
                    <FormItem className="flex flex-col">
                      <FormLabel>Product Run End</FormLabel>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "flex-1 pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                                disabled={mode === 'view'}
                              >
                                {field.value ? (
                                  <>
                                    {format(field.value, "PPP")}
                                    {timeValue && timeValue.trim() && (
                                      <span className="ml-2 text-muted-foreground">at {timeValue}</span>
                                    )}
                                  </>
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={mode === 'view'}
                              initialFocus
                              className="pointer-events-auto"
                            />
                            <div className="p-3 border-t">
                              <FormField
                                control={form.control}
                                name="product_run_end_time"
                                render={({ field: timeField }) => (
                                   <div className="flex flex-col gap-2">
                                     <label className="text-sm font-medium">Time (Optional)</label>
                                     <Input 
                                       type="time" 
                                       {...timeField} 
                                       disabled={mode === 'view'}
                                       className="w-full"
                                       step="60"
                                     />
                                   </div>
                                )}
                              />
                            </div>
                          </PopoverContent>
                        </Popover>
                        {field.value && mode !== 'view' && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive/90"
                            onClick={() => {
                              field.onChange(undefined);
                              form.setValue('product_run_end_time', '');
                            }}
                          >
                            <span className="sr-only">Clear date</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {mode !== 'view' && (
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}