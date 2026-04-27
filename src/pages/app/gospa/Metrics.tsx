import { useQuery } from "@tanstack/react-query";
import { gospa } from "@/lib/gospaService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function GospaMetrics() {
  const metricsQ = useQuery({ queryKey: ["gospa-metrics"], queryFn: async () => (await gospa.listMetrics()).data ?? [] });
  const objsQ = useQuery({ queryKey: ["gospa-objectives"], queryFn: async () => (await gospa.listObjectives()).data ?? [] });
  const objName = (id: string) => objsQ.data?.find(o => o.id === id)?.title ?? "—";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <h1 className="text-3xl font-bold">Metrics</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {(metricsQ.data ?? []).map(m => {
          const variance = m.target_value && m.current_value != null ? Math.round(((Number(m.current_value) - Number(m.target_value)) / Number(m.target_value)) * 100) : null;
          const Trend = m.trend === "up" ? TrendingUp : m.trend === "down" ? TrendingDown : Minus;
          return (
            <Card key={m.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{m.name}</CardTitle>
                <div className="text-xs text-muted-foreground">{objName(m.objective_id)}</div>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-2xl font-bold">{m.current_value ?? "—"} <span className="text-xs text-muted-foreground">{m.unit}</span></div>
                    <div className="text-xs text-muted-foreground">Target: {m.target_value ?? "—"}</div>
                  </div>
                  <Trend className={`h-5 w-5 ${m.trend === "up" ? "text-green-600" : m.trend === "down" ? "text-destructive" : "text-muted-foreground"}`}/>
                </div>
                {variance !== null && <div className={`text-xs mt-1 ${variance >= 0 ? "text-green-600" : "text-destructive"}`}>{variance >= 0 ? "+" : ""}{variance}% vs target</div>}
              </CardContent>
            </Card>
          );
        })}
        {!metricsQ.data?.length && <div className="text-sm text-muted-foreground">No metrics yet — add them inside an objective workspace.</div>}
      </div>
    </div>
  );
}
