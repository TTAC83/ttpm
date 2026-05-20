import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { metricsService } from "@/lib/metricsService";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metricId?: string | null;
  meetingId?: string | null;
  onCreated?: () => void;
}

export function AddActionDialog({ open, onOpenChange, metricId, meetingId, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [details, setDetails] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [isCritical, setIsCritical] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      await metricsService.createAction({
        title: title.trim(),
        details: details.trim() || null,
        planned_date: plannedDate || null,
        is_critical: isCritical,
        metric_id: metricId ?? null,
        metric_meeting_id: meetingId ?? null,
      });
      toast.success('Action created');
      onCreated?.();
      onOpenChange(false);
      setTitle(''); setDetails(''); setPlannedDate(''); setIsCritical(false);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Action</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Details</Label><Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} /></div>
          <div><Label>Planned date</Label><Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} /></div>
          <div className="flex items-center gap-2">
            <Checkbox id="critical" checked={isCritical} onCheckedChange={(v) => setIsCritical(!!v)} />
            <Label htmlFor="critical">Critical</Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Create'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
