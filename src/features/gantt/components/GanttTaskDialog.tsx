/**
 * Dialog for editing/viewing Gantt task details
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { GanttItem, GanttItemStatus } from '../types/gantt.types';
import { cn } from '@/lib/utils';

interface GanttTaskDialogProps {
  item: GanttItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (itemId: string, updates: Partial<GanttItem>) => Promise<void>;
  availableAssignees?: Array<{ id: string; name: string }>;
}

export const GanttTaskDialog: React.FC<GanttTaskDialogProps> = ({
  item,
  open,
  onOpenChange,
  onSave,
  availableAssignees = [],
}) => {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<GanttItemStatus>('not-started');
  const [plannedStart, setPlannedStart] = useState<Date | null>(null);
  const [plannedEnd, setPlannedEnd] = useState<Date | null>(null);
  const [actualStart, setActualStart] = useState<Date | null>(null);
  const [actualEnd, setActualEnd] = useState<Date | null>(null);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      setName(item.name);
      setStatus(item.status);
      setPlannedStart(item.plannedStart);
      setPlannedEnd(item.plannedEnd);
      setActualStart(item.actualStart);
      setActualEnd(item.actualEnd);
      setAssigneeId(item.assigneeId || '');
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      await onSave(item.id, {
        name,
        status,
        plannedStart,
        plannedEnd,
        actualStart,
        actualEnd,
        assigneeId: assigneeId || undefined,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {item.type === 'step' ? 'Step' : item.type === 'task' ? 'Task' : 'Subtask'}</DialogTitle>
          <DialogDescription>
            Update the details for this {item.type}. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Task name"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as GanttItemStatus)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not-started">Not Started</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          {availableAssignees.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {availableAssignees.map(assignee => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Dates Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Planned Start */}
            <div className="space-y-2">
              <Label>Planned Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !plannedStart && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedStart ? format(plannedStart, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={plannedStart || undefined}
                    onSelect={(date) => setPlannedStart(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Planned End */}
            <div className="space-y-2">
              <Label>Planned End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !plannedEnd && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {plannedEnd ? format(plannedEnd, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={plannedEnd || undefined}
                    onSelect={(date) => setPlannedEnd(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actual Start */}
            <div className="space-y-2">
              <Label>Actual Start</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !actualStart && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {actualStart ? format(actualStart, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={actualStart || undefined}
                    onSelect={(date) => setActualStart(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actual End */}
            <div className="space-y-2">
              <Label>Actual End</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !actualEnd && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {actualEnd ? format(actualEnd, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={actualEnd || undefined}
                    onSelect={(date) => setActualEnd(date || null)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
