import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Plus, AlertTriangle, CheckCircle2, LineChart } from "lucide-react";
import { metricsService, computeOnTarget, type Metric, type MetricReading } from "@/lib/metricsService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { NewMetricDialog } from "./NewMetricDialog";

function statusOf(metric: Metric, latest?: MetricReading): 'green' | 'red' | 'neutral' {
  if (!latest) return 'neutral';
  const ok = computeOnTarget(latest.actual_value, metric.target_value, metric.direction, metric.tolerance);
  return ok ? 'green' : 'red';
}

export default function MetricsDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['metrics'],
    queryFn: () => metricsService.listMetrics(),
  });

  const { data: latest } = useQuery({
    queryKey: ['metrics', 'latest', metrics?.map((m) => m.id)],
    queryFn: () => metricsService.latestReadings(metrics!.map((m) => m.id)),
    enabled: !!metrics && metrics.length > 0,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <LineChart className="h-6 w-6" /> Metrics
          </h1>
          <p className="text-sm text-muted-foreground">Track targets and review performance in scheduled meetings.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/app/metrics/meetings')}>Meetings</Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> New Metric
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : !metrics || metrics.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No metrics yet. Create your first metric to begin tracking.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((m) => {
            const latestReading = latest?.[m.id];
            const status = statusOf(m, latestReading);
            return (
              <Card
                key={m.id}
                onClick={() => navigate(`/app/metrics/${m.id}`)}
                className={`cursor-pointer transition hover:shadow-md ${
                  status === 'red' ? 'border-destructive border-2' : status === 'green' ? 'border-primary/40' : ''
                }`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{m.title}</CardTitle>
                    {status === 'red' && <AlertTriangle className="h-5 w-5 text-destructive" />}
                    {status === 'green' && <CheckCircle2 className="h-5 w-5 text-primary" />}
                  </div>
                  <Badge variant="secondary" className="w-fit capitalize">{m.category}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {latestReading ? `${latestReading.actual_value}${m.unit ? ` ${m.unit}` : ''}` : '—'}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Target: {m.target_value ?? '—'}{m.unit ? ` ${m.unit}` : ''} · {m.direction.replace(/_/g, ' ')}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <NewMetricDialog open={dialogOpen} onOpenChange={setDialogOpen} onCreated={() => qc.invalidateQueries({ queryKey: ['metrics'] })} />
    </div>
  );
}
