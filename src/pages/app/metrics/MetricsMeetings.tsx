import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { metricsService } from "@/lib/metricsService";
import { toast } from "sonner";
import { format } from "date-fns";

function NewMeetingDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const { data: metrics } = useQuery({ queryKey: ['metrics'], queryFn: () => metricsService.listMetrics(), enabled: open });

  async function save() {
    if (!title.trim()) { toast.error('Title required'); return; }
    setSaving(true);
    try {
      const metricIds = Object.entries(selected).filter(([, v]) => v).map(([k]) => k);
      await metricsService.createMeeting({
        title: title.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        notes: notes || null,
        metricIds,
      });
      toast.success('Meeting scheduled');
      onCreated();
      onOpenChange(false);
      setTitle(''); setNotes(''); setSelected({});
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Schedule Review Meeting</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly Ops Review" /></div>
          <div><Label>Date & time</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
          <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
          <div>
            <Label>Metrics to review</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-auto space-y-2">
              {metrics?.length ? metrics.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <Checkbox
                    id={m.id}
                    checked={!!selected[m.id]}
                    onCheckedChange={(v) => setSelected((s) => ({ ...s, [m.id]: !!v }))}
                  />
                  <Label htmlFor={m.id} className="font-normal cursor-pointer">{m.title}</Label>
                </div>
              )) : <p className="text-sm text-muted-foreground">No metrics defined yet.</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Schedule'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function MetricsMeetings() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data: meetings, isLoading } = useQuery({ queryKey: ['metric_meetings'], queryFn: () => metricsService.listMeetings() });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/app/metrics')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Review Meetings</h1>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New Meeting</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">All meetings</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p>Loading…</p> : meetings && meetings.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Scheduled</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {meetings.map((m) => (
                  <TableRow key={m.id} className="cursor-pointer" onClick={() => navigate(`/app/metrics/meetings/${m.id}`)}>
                    <TableCell className="font-medium">{m.title}</TableCell>
                    <TableCell>{format(new Date(m.scheduled_at), 'PPp')}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{m.status.replace('_', ' ')}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">No meetings yet.</p>}
        </CardContent>
      </Card>
      <NewMeetingDialog open={open} onOpenChange={setOpen} onCreated={() => qc.invalidateQueries({ queryKey: ['metric_meetings'] })} />
    </div>
  );
}
