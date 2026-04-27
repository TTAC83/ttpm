import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { gospa } from "@/lib/gospaService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Target } from "lucide-react";
import { toast } from "sonner";
import { RAGBadge } from "@/components/gospa/RAGBadge";

export default function GoalsList() {
  const qc = useQueryClient();
  const goalsQ = useQuery({ queryKey: ["gospa-goals"], queryFn: async () => (await gospa.listGoals()).data ?? [] });
  const objsQ = useQuery({ queryKey: ["gospa-objectives"], queryFn: async () => (await gospa.listObjectives()).data ?? [] });

  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [gTitle, setGTitle] = useState(""); const [gDesc, setGDesc] = useState("");
  const [gStart, setGStart] = useState(""); const [gEnd, setGEnd] = useState("");

  const [newObjFor, setNewObjFor] = useState<string | null>(null);
  const [oTitle, setOTitle] = useState(""); const [oOutcome, setOOutcome] = useState("");

  const createGoal = async () => {
    if (!gTitle.trim()) return;
    const { error } = await gospa.createGoal({ title: gTitle, description: gDesc, timeframe_start: gStart || null, timeframe_end: gEnd || null });
    if (error) return toast.error(error.message);
    toast.success("Goal created"); setNewGoalOpen(false);
    setGTitle(""); setGDesc(""); setGStart(""); setGEnd("");
    qc.invalidateQueries({ queryKey: ["gospa-goals"] });
  };

  const createObj = async () => {
    if (!oTitle.trim() || !newObjFor) return;
    const existing = (objsQ.data ?? []).filter(o => o.goal_id === newObjFor);
    const { error } = await gospa.createObjective({ goal_id: newObjFor, title: oTitle, target_outcome: oOutcome, order_index: Math.min(existing.length + 1, 6) });
    if (error) return toast.error(error.message);
    toast.success("Objective created (6 questions auto-seeded)");
    setNewObjFor(null); setOTitle(""); setOOutcome("");
    qc.invalidateQueries({ queryKey: ["gospa-objectives"] });
  };

  const deleteGoal = async (id: string) => {
    if (!confirm("Delete this goal and all nested objectives/strategies/plans?")) return;
    const { error } = await gospa.deleteGoal(id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gospa-goals"] });
    qc.invalidateQueries({ queryKey: ["gospa-objectives"] });
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Target className="h-7 w-7 text-primary" /> GOSPA Goals</h1>
          <p className="text-sm text-muted-foreground">Strategic goals and their objectives.</p>
        </div>
        <Dialog open={newGoalOpen} onOpenChange={setNewGoalOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Goal</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Title" value={gTitle} onChange={e => setGTitle(e.target.value)} />
              <Textarea placeholder="Description" value={gDesc} onChange={e => setGDesc(e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input type="date" value={gStart} onChange={e => setGStart(e.target.value)} />
                <Input type="date" value={gEnd} onChange={e => setGEnd(e.target.value)} />
              </div>
            </div>
            <DialogFooter><Button onClick={createGoal}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {(goalsQ.data ?? []).map(goal => {
        const objs = (objsQ.data ?? []).filter(o => o.goal_id === goal.id);
        return (
          <Card key={goal.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{goal.title}</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{goal.timeframe_start ?? "—"} → {goal.timeframe_end ?? "—"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteGoal(goal.id)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {objs.map(o => (
                  <Link key={o.id} to={`/app/gospa/objectives/${o.id}`} className="block">
                    <Card className="hover:border-primary transition-colors h-full">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-1"><RAGBadge value={o.rag_status}/><span className="text-xs text-muted-foreground">#{o.order_index}</span></div>
                        <div className="font-medium text-sm">{o.title}</div>
                        {o.target_outcome && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{o.target_outcome}</div>}
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={() => setNewObjFor(goal.id)} disabled={objs.length >= 6}>
                <Plus className="h-3.5 w-3.5 mr-1"/> Add Objective ({objs.length}/6)
              </Button>
            </CardContent>
          </Card>
        );
      })}
      {!goalsQ.data?.length && <div className="text-sm text-muted-foreground">No goals yet — create your first.</div>}

      <Dialog open={!!newObjFor} onOpenChange={o => !o && setNewObjFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Objective</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Title" value={oTitle} onChange={e => setOTitle(e.target.value)} />
            <Textarea placeholder="Target outcome" value={oOutcome} onChange={e => setOOutcome(e.target.value)} />
          </div>
          <DialogFooter><Button onClick={createObj}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
