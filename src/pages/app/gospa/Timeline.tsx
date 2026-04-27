import { useQuery } from "@tanstack/react-query";
import { gospa } from "@/lib/gospaService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/gospa/StatusPill";

export default function GospaTimeline() {
  const plansQ = useQuery({ queryKey: ["gospa-plans-all"], queryFn: async () => (await gospa.listPlans()).data ?? [] });
  const actionsQ = useQuery({ queryKey: ["gospa-actions-all"], queryFn: async () => (await gospa.listActions()).data ?? [] });

  const items = [
    ...(plansQ.data ?? []).map(p => ({ kind: "Plan", id: p.id, title: p.title, start: p.start_date, end: p.end_date, status: p.status as any })),
    ...(actionsQ.data ?? []).map(a => ({ kind: "Action", id: a.id, title: a.task_title, start: a.planned_start, end: a.planned_end, status: a.status as any })),
  ].filter(i => i.start || i.end).sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">GOSPA Timeline</h1>
      <Card>
        <CardHeader><CardTitle className="text-base">Plans & Actions ({items.length})</CardTitle></CardHeader>
        <CardContent className="space-y-1">
          {items.map(i => (
            <div key={`${i.kind}-${i.id}`} className="flex items-center gap-3 text-sm border-b py-1">
              <span className="text-xs font-mono text-muted-foreground w-14">{i.kind}</span>
              <span className="flex-1 truncate">{i.title}</span>
              <span className="text-xs text-muted-foreground">{i.start ?? "—"} → {i.end ?? "—"}</span>
              {typeof i.status === "string" && i.kind === "Plan" && <StatusPill value={i.status}/>}
              {typeof i.status === "string" && i.kind === "Action" && <span className="text-xs">{i.status}</span>}
            </div>
          ))}
          {!items.length && <div className="text-sm text-muted-foreground">Add dates to plans/actions to see them here.</div>}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Tip: a full SVG Gantt with drag-resize will reuse <code>src/features/gantt</code> in the next iteration.</p>
    </div>
  );
}
