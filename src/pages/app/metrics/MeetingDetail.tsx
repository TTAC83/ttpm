import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { metricsService, computeOnTarget, type MetricMeetingStatus } from "@/lib/metricsService";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddActionDialog } from "./AddActionDialog";

const STATUSES: MetricMeetingStatus[] = ['scheduled', 'in_progress', 'completed', 'cancelled'];

function MetricRow({ metric, meetingId, onSaved }: { metric: any; meetingId: string; onSaved: () => void }) {
  const [value, setValue] = useState('');
  const [periodDate, setPeriodDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [saving, setSaving] = useState(false);
  const [lastStatus, setLastStatus] = useState<'green' | 'red' | null>(null);

  async function save() {
    if (value === '') return;
    setSaving(true);
    try {
      const onT = computeOnTarget(Number(value), metric.target_value, metric.direction, metric.tolerance);
      await metricsService.addReading({
        metric_id: metric.id,
        meeting_id: meetingId,
        period_date: periodDate,
        actual_value: Number(value),
        on_target: onT,
      });
      setLastStatus(onT ? 'green' : 'red');
      toast.success(onT ? 'On target' : 'Off target');
      setValue('');
      onSaved();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <TableRow className={lastStatus === 'red' ? 'bg-destructive/5' : ''}>
      <TableCell className="font-medium">{metric.title}</TableCell>
      <TableCell>{metric.target_value ?? '—'}{metric.unit ? ` ${metric.unit}` : ''}</TableCell>
      <TableCell><Input type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} className="w-40" /></TableCell>
      <TableCell><Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Enter actual" className="w-32" /></TableCell>
      <TableCell>
        {lastStatus === 'green' && <CheckCircle2 className="h-5 w-5 text-primary" />}
        {lastStatus === 'red' && <AlertTriangle className="h-5 w-5 text-destructive" />}
      </TableCell>
      <TableCell><Button size="sm" onClick={save} disabled={saving || value === ''}>Save</Button></TableCell>
    </TableRow>
  );
}

export default function MeetingDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionOpen, setActionOpen] = useState(false);

  const { data: meeting } = useQuery({ queryKey: ['metric_meeting', id], queryFn: () => metricsService.getMeeting(id), enabled: !!id });
  const { data: metrics } = useQuery({ queryKey: ['metric_meeting', id, 'metrics'], queryFn: () => metricsService.listMeetingMetrics(id), enabled: !!id });
  const { data: actions } = useQuery({ queryKey: ['metric_meeting', id, 'actions'], queryFn: () => metricsService.listMeetingActions(id), enabled: !!id });

  async function updateStatus(status: MetricMeetingStatus) {
    try {
      await metricsService.updateMeeting(id, { status });
      qc.invalidateQueries({ queryKey: ['metric_meeting', id] });
      qc.invalidateQueries({ queryKey: ['metric_meetings'] });
      toast.success('Status updated');
    } catch (e: any) { toast.error(e.message); }
  }

  if (!meeting) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/app/metrics/meetings')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{meeting.title}</h1>
          <p className="text-sm text-muted-foreground">{format(new Date(meeting.scheduled_at), 'PPPp')}</p>
          {meeting.notes && <p className="mt-2 text-sm">{meeting.notes}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={meeting.status} onValueChange={(v) => updateStatus(v as MetricMeetingStatus)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setActionOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Action</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Metrics in scope</CardTitle></CardHeader>
        <CardContent>
          {metrics && metrics.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead><TableHead>Target</TableHead><TableHead>Period</TableHead>
                  <TableHead>Actual</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((m) => (
                  <MetricRow key={m.id} metric={m} meetingId={id} onSaved={() => qc.invalidateQueries({ queryKey: ['metrics'] })} />
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">No metrics linked to this meeting.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Actions raised in this meeting</CardTitle></CardHeader>
        <CardContent>
          {actions && actions.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Planned</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {actions.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.title}</TableCell>
                    <TableCell>{a.planned_date ?? '—'}</TableCell>
                    <TableCell><Badge variant="secondary">{a.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <p className="text-sm text-muted-foreground">None yet.</p>}
        </CardContent>
      </Card>

      <AddActionDialog
        open={actionOpen}
        onOpenChange={setActionOpen}
        meetingId={id}
        onCreated={() => qc.invalidateQueries({ queryKey: ['metric_meeting', id, 'actions'] })}
      />
    </div>
  );
}
