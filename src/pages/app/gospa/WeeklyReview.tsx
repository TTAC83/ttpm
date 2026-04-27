import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { gospa, gospaAI } from "@/lib/gospaService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, format } from "date-fns";

export default function WeeklyReview() {
  const qc = useQueryClient();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const reviewQ = useQuery({ queryKey: ["gospa-weekly", weekStart], queryFn: async () => (await gospa.getWeeklyReview(weekStart)).data });
  const objsQ = useQuery({ queryKey: ["gospa-objectives"], queryFn: async () => (await gospa.listObjectives()).data ?? [] });
  const actionsQ = useQuery({ queryKey: ["gospa-actions-all"], queryFn: async () => (await gospa.listActions()).data ?? [] });
  const blockersQ = useQuery({ queryKey: ["gospa-blockers-all"], queryFn: async () => (await gospa.listBlockers()).data ?? [] });

  const [summary, setSummary] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const overdue = (actionsQ.data ?? []).filter(a => a.planned_end && a.planned_end < today && a.status !== "Done");
  const dueThisWeek = (actionsQ.data ?? []).filter(a => a.planned_end && a.planned_end >= weekStart && a.planned_end <= format(new Date(new Date(weekStart).getTime() + 6*86400000), "yyyy-MM-dd"));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Weekly GOSPA Review</h1>
          <p className="text-sm text-muted-foreground">Week of {weekStart}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => {
            toast.info("Generating summary…");
            const { data, error } = await gospaAI.weeklySummary(weekStart);
            if (error) return toast.error(error.message);
            const text = (data as any)?.summary ?? "";
            setSummary(text);
            qc.invalidateQueries({ queryKey: ["gospa-weekly", weekStart] });
            toast.success("Summary generated");
          }}><Sparkles className="h-4 w-4 mr-2"/>Auto-generate summary</Button>
          <Button onClick={async () => {
            const { error } = await gospa.upsertWeeklyReview(weekStart, summary || reviewQ.data?.summary_md || "");
            if (error) return toast.error(error.message);
            toast.success("Saved");
          }}><Save className="h-4 w-4 mr-2"/>Save</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{objsQ.data?.length ?? 0}</div><div className="text-xs text-muted-foreground">Objectives</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-destructive">{overdue.length}</div><div className="text-xs text-muted-foreground">Overdue</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{dueThisWeek.length}</div><div className="text-xs text-muted-foreground">Due this week</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Weekly Summary</CardTitle></CardHeader>
        <CardContent>
          <Textarea rows={12} value={summary || reviewQ.data?.summary_md || ""} onChange={e => setSummary(e.target.value)} placeholder="Enter or auto-generate the weekly summary…"/>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader><CardTitle className="text-base">Due this week</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {dueThisWeek.map(a => <div key={a.id} className="flex justify-between border-b py-1"><span>{a.task_title}</span><span className="text-xs text-muted-foreground">{a.planned_end}</span></div>)}
            {!dueThisWeek.length && <div className="text-muted-foreground">Nothing due.</div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Open Blockers</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            {(blockersQ.data ?? []).filter(b => b.status !== "closed").map(b => <div key={b.id} className="flex justify-between border-b py-1"><span>{b.description}</span><span className="text-xs uppercase text-muted-foreground">{b.severity}</span></div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
