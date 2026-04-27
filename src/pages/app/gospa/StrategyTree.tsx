import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { gospa } from "@/lib/gospaService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RAGBadge } from "@/components/gospa/RAGBadge";
import { StatusPill } from "@/components/gospa/StatusPill";
import { ChevronRight } from "lucide-react";

export default function StrategyTree() {
  const goalsQ = useQuery({ queryKey: ["gospa-goals"], queryFn: async () => (await gospa.listGoals()).data ?? [] });
  const objsQ = useQuery({ queryKey: ["gospa-objectives"], queryFn: async () => (await gospa.listObjectives()).data ?? [] });
  const stratsQ = useQuery({ queryKey: ["gospa-strats-all"], queryFn: async () => (await gospa.listStrategies()).data ?? [] });
  const plansQ = useQuery({ queryKey: ["gospa-plans-all"], queryFn: async () => (await gospa.listPlans()).data ?? [] });
  const actionsQ = useQuery({ queryKey: ["gospa-actions-all"], queryFn: async () => (await gospa.listActions()).data ?? [] });

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold">Strategy → Execution Tree</h1>
      {(goalsQ.data ?? []).map(g => (
        <Card key={g.id}>
          <CardHeader><CardTitle>🎯 {g.title}</CardTitle></CardHeader>
          <CardContent className="space-y-2 pl-4 border-l-2 border-primary/40">
            {(objsQ.data ?? []).filter(o => o.goal_id === g.id).map(o => (
              <div key={o.id} className="space-y-1">
                <Link to={`/app/gospa/objectives/${o.id}`} className="flex items-center gap-2 font-semibold hover:text-primary">
                  <ChevronRight className="h-3 w-3"/> {o.title} <RAGBadge value={o.rag_status}/>
                </Link>
                <div className="pl-6 space-y-1 border-l border-muted">
                  {(stratsQ.data ?? []).filter(s => s.objective_id === o.id).map(s => (
                    <div key={s.id}>
                      <div className="flex items-center gap-2 text-sm"><ChevronRight className="h-3 w-3"/> {s.title} <StatusPill value={s.status}/></div>
                      <div className="pl-6 space-y-0.5">
                        {(plansQ.data ?? []).filter(p => p.strategy_id === s.id).map(p => {
                          const planActions = (actionsQ.data ?? []).filter(a => a.gospa_plan_id === p.id);
                          const done = planActions.filter(a => a.status === "Done").length;
                          const pct = planActions.length ? Math.round((done / planActions.length) * 100) : 0;
                          return (
                            <div key={p.id} className="text-xs text-muted-foreground">
                              📋 {p.title} — {done}/{planActions.length} actions ({pct}%)
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
