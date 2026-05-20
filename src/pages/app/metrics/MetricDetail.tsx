import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { metricsService, computeOnTarget } from "@/lib/metricsService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { AddActionDialog } from "./AddActionDialog";

export default function MetricDetail() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [actionDialogOpen, setActionDialogOpen] = useState(false);

  const { data: metric } = useQuery({ queryKey: ['metric', id], queryFn: () => metricsService.getMetric(id), enabled: !!id });
  const { data: readings } = useQuery({ queryKey: ['metric', id, 'readings'], queryFn: () => metricsService.listReadings(id), enabled: !!id });
  const { data: actions } = useQuery({ queryKey: ['metric', id, 'actions'], queryFn: () => metricsService.listMetricActions(id), enabled: !!id });

  const [actual, setActual] = useState('');
  const [periodDate, setPeriodDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [commentary, setCommentary] = useState('');

  async function addReading() {
    if (!metric || actual === '') return;
    const onTarget = computeOnTarget(Number(actual), metric.target_value, metric.direction, metric.tolerance);
    try {
      await metricsService.addReading({
        metric_id: metric.id,
        period_date: periodDate,
        actual_value: Number(actual),
        on_target: onTarget,
        commentary: commentary || null,
      });
      toast.success(onTarget ? 'On target' : 'Off target — consider raising an action');
      setActual(''); setCommentary('');
      qc.invalidateQueries({ queryKey: ['metric', id, 'readings'] });
      qc.invalidateQueries({ queryKey: ['metrics'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  if (!metric) return null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/app/metrics')}>
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{metric.title}</h1>
            <div className="text-sm text-muted-foreground mt-1">
              <Badge variant="secondary" className="capitalize mr-2">{metric.category}</Badge>
              Target: {metric.target_value ?? '—'}{metric.unit ? ` ${metric.unit}` : ''} · {metric.direction.replace(/_/g, ' ')}
              {metric.owner && <> · Owner: {metric.owner}</>}
            </div>
          </div>
          <Button onClick={() => setActionDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Add Action</Button>
        </div>
        {metric.description && <p className="mt-3 text-sm">{metric.description}</p>}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Log a reading</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Period date</Label>
              <Input type="date" value={periodDate} onChange={(e) => setPeriodDate(e.target.value)} />
            </div>
            <div>
              <Label>Actual value</Label>
              <Input type="number" value={actual} onChange={(e) => setActual(e.target.value)} />
            </div>
            <div className="flex items-end"><Button onClick={addReading} className="w-full">Save reading</Button></div>
          </div>
          <div>
            <Label>Commentary</Label>
            <Textarea value={commentary} onChange={(e) => setCommentary(e.target.value)} rows={2} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow><TableHead>Period</TableHead><TableHead>Value</TableHead><TableHead>Status</TableHead><TableHead>Commentary</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {readings && readings.length > 0 ? readings.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.period_date}</TableCell>
                  <TableCell className="font-medium">{r.actual_value}{metric.unit ? ` ${metric.unit}` : ''}</TableCell>
                  <TableCell>
                    {r.on_target
                      ? <Badge className="bg-primary/15 text-primary border-primary/30">On target</Badge>
                      : <Badge variant="destructive">Off target</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.commentary ?? ''}</TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No readings yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Linked actions</CardTitle></CardHeader>
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
          ) : <p className="text-sm text-muted-foreground">No actions linked to this metric.</p>}
        </CardContent>
      </Card>

      <AddActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        metricId={metric.id}
        onCreated={() => qc.invalidateQueries({ queryKey: ['metric', id, 'actions'] })}
      />
    </div>
  );
}
