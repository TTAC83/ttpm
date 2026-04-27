import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { gospa } from "@/lib/gospaService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RAGBadge } from "@/components/gospa/RAGBadge";
import { Target, AlertTriangle, CheckCircle2, TrendingUp, Calendar, ChevronRight, ListTree } from "lucide-react";
import { StatusPill } from "@/components/gospa/StatusPill";

export default function GospaDashboard() {
  const goalsQ = useQuery({ queryKey: ["gospa-goals"], queryFn: async () => (await gospa.listGoals()).data ?? [] });
  const objectivesQ = useQuery({ queryKey: ["gospa-objectives"], queryFn: async () => (await gospa.listObjectives()).data ?? [] });
  const blockersQ = useQuery({ queryKey: ["gospa-blockers"], queryFn: async () => (await gospa.listBlockers()).data ?? [] });
  const actionsQ = useQuery({ queryKey: ["gospa-actions"], queryFn: async () => (await gospa.listActions()).data ?? [] });
  const metricsQ = useQuery({ queryKey: ["gospa-metrics"], queryFn: async () => (await gospa.listMetrics()).data ?? [] });
  const stratsQ = useQuery({ queryKey: ["gospa-strats-all"], queryFn: async () => (await gospa.listStrategies()).data ?? [] });
  const plansQ = useQuery({ queryKey: ["gospa-plans-all"], queryFn: async () => (await gospa.listPlans()).data ?? [] });

  const today = new Date().toISOString().slice(0, 10);
  const overdue = (actionsQ.data ?? []).filter(a => a.planned_end && a.planned_end < today && a.status !== "Done");
  const openBlockers = (blockersQ.data ?? []).filter(b => b.status !== "closed");
  const activeGoal = goalsQ.data?.[0];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Target className="h-7 w-7 text-primary" /> GOSPA Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Goal → Objectives → Strategies → Plans → Actions → Metrics</p>
        </div>
        <div className="flex gap-2">
          <Link to="/app/gospa/weekly-review"><Button variant="outline"><Calendar className="h-4 w-4 mr-2" />Weekly Review</Button></Link>
          <Link to="/app/gospa/goals"><Button>Manage Goals</Button></Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{objectivesQ.data?.length ?? 0}</div><div className="text-xs text-muted-foreground flex items-center gap-1"><Target className="h-3 w-3"/> Objectives</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive">{overdue.length}</div><div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Overdue actions</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-yellow-600">{openBlockers.length}</div><div className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> Open blockers</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{metricsQ.data?.length ?? 0}</div><div className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3"/> Tracked metrics</div></CardContent></Card>
      </div>

      {/* Active Goal */}
      <Card>
        <CardHeader><CardTitle>Active Goal</CardTitle></CardHeader>
        <CardContent>
          {activeGoal ? (
            <div>
              <div className="text-xl font-semibold">{activeGoal.title}</div>
              <p className="text-muted-foreground text-sm mt-1">{activeGoal.description}</p>
              <div className="text-xs text-muted-foreground mt-2">{activeGoal.timeframe_start ?? "—"} → {activeGoal.timeframe_end ?? "—"}</div>
            </div>
          ) : (
            <div className="text-muted-foreground text-sm">No goal yet. <Link className="text-primary underline" to="/app/gospa/goals">Create one</Link>.</div>
          )}
        </CardContent>
      </Card>

      {/* Objectives grid */}
      <Card>
        <CardHeader><CardTitle>Objectives</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(objectivesQ.data ?? []).map(o => (
            <Link key={o.id} to={`/app/gospa/objectives/${o.id}`} className="block">
              <Card className="hover:border-primary transition-colors h-full">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <RAGBadge value={o.rag_status} />
                    <span className="text-xs text-muted-foreground">#{o.order_index}</span>
                  </div>
                  <div className="font-semibold">{o.title}</div>
                  {o.target_outcome && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.target_outcome}</div>}
                </CardContent>
              </Card>
            </Link>
          ))}
          {!objectivesQ.data?.length && <div className="text-sm text-muted-foreground col-span-full">No objectives yet.</div>}
        </CardContent>
      </Card>

      {/* Strategies & Plans overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ListTree className="h-5 w-5"/> Strategies & Plans</CardTitle>
          <Link to="/app/gospa/strategy"><Button variant="outline" size="sm">Full tree</Button></Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {(objectivesQ.data ?? []).map(o => {
            const strats = (stratsQ.data ?? []).filter(s => s.objective_id === o.id);
            if (!strats.length) return (
              <div key={o.id} className="text-sm border-l-2 border-muted pl-3">
                <Link to={`/app/gospa/objectives/${o.id}`} className="font-medium hover:text-primary">{o.title}</Link>
                <span className="text-xs text-muted-foreground ml-2">— no strategies yet. <Link to={`/app/gospa/objectives/${o.id}`} className="text-primary underline">Add</Link></span>
              </div>
            );
            return (
              <div key={o.id} className="border-l-2 border-primary/40 pl-3 space-y-2">
                <Link to={`/app/gospa/objectives/${o.id}`} className="font-semibold hover:text-primary inline-flex items-center gap-1">
                  <RAGBadge value={o.rag_status}/> {o.title}
                </Link>
                {strats.map(s => {
                  const plans = (plansQ.data ?? []).filter(p => p.strategy_id === s.id);
                  return (
                    <div key={s.id} className="ml-4 border-l border-muted pl-3 space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <ChevronRight className="h-3 w-3 text-muted-foreground"/>
                        <span className="font-medium">{s.title}</span>
                        <StatusPill value={s.status}/>
                      </div>
                      {plans.length ? (
                        <div className="ml-5 space-y-0.5">
                          {plans.map(p => {
                            const planActions = (actionsQ.data ?? []).filter(a => a.gospa_plan_id === p.id);
                            const done = planActions.filter(a => a.status === "Done").length;
                            const pct = planActions.length ? Math.round((done / planActions.length) * 100) : 0;
                            return (
                              <div key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>📋 {p.title}</span>
                                <span>·</span>
                                <span>{p.start_date ?? "—"} → {p.end_date ?? "—"}</span>
                                <span>·</span>
                                <span>{done}/{planActions.length} ({pct}%)</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="ml-5 text-xs text-muted-foreground italic">No plans yet.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {!objectivesQ.data?.length && <div className="text-sm text-muted-foreground">Create a goal and objectives to start adding strategies and plans.</div>}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive"/> Overdue Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {overdue.slice(0,5).map(a => (
              <div key={a.id} className="flex items-center justify-between text-sm border-b pb-1">
                <span className="truncate">{a.task_title}</span>
                <span className="text-xs text-destructive">{a.planned_end}</span>
              </div>
            ))}
            {!overdue.length && <div className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600"/> Nothing overdue.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600"/> Open Blockers</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {openBlockers.slice(0,5).map(b => (
              <div key={b.id} className="flex items-center justify-between text-sm border-b pb-1">
                <span className="truncate">{b.description}</span>
                <span className="text-xs uppercase text-muted-foreground">{b.severity}</span>
              </div>
            ))}
            {!openBlockers.length && <div className="text-sm text-muted-foreground">No open blockers.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
