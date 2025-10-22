import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { HardwareStage, HardwareStatusType } from '@/lib/hardwareStatusService';

interface HardwareStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage: HardwareStage;
  hardwareType: string;
  lineName?: string;
  equipmentName?: string;
  skuModel?: string;
  currentStatus?: {
    status: HardwareStatusType;
    start_date?: string;
    complete_date?: string;
    notes?: string;
  };
  onSave: (data: {
    status: HardwareStatusType;
    start_date?: string;
    complete_date?: string;
    notes?: string;
  }) => Promise<void>;
}

const stageLabels: Record<HardwareStage, string> = {
  ordered: 'Ordered',
  configured: 'Configured',
  bench_tested: 'Bench Tested',
  shipped: 'Shipped',
  installed: 'Installed',
  validated: 'Validated',
};

export const HardwareStatusDialog = ({
  open,
  onOpenChange,
  stage,
  hardwareType,
  lineName,
  equipmentName,
  skuModel,
  currentStatus,
  onSave,
}: HardwareStatusDialogProps) => {
  const [status, setStatus] = useState<HardwareStatusType>(currentStatus?.status || 'open');
  const [startDate, setStartDate] = useState<Date | undefined>(
    currentStatus?.start_date ? new Date(currentStatus.start_date) : undefined
  );
  const [completeDate, setCompleteDate] = useState<Date | undefined>(
    currentStatus?.complete_date ? new Date(currentStatus.complete_date) : undefined
  );
  const [notes, setNotes] = useState(currentStatus?.notes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        status,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        complete_date: completeDate ? format(completeDate, 'yyyy-MM-dd') : undefined,
        notes: notes || undefined,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update {stageLabels[stage]} Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
            <div><span className="font-medium">Type:</span> {hardwareType}</div>
            {lineName && <div><span className="font-medium">Line:</span> {lineName}</div>}
            {equipmentName && <div><span className="font-medium">Equipment:</span> {equipmentName}</div>}
            {skuModel && <div><span className="font-medium">SKU/Model:</span> {skuModel}</div>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as HardwareStatusType)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !startDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Complete Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !completeDate && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {completeDate ? format(completeDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={completeDate} onSelect={setCompleteDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add any notes..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
