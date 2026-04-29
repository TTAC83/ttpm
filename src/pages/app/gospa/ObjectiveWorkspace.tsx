import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { gospa, gospaAI } from "@/lib/gospaService";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { RAGBadge } from "@/components/gospa/RAGBadge";
import { StatusPill } from "@/components/gospa/StatusPill";
import { RichTextEditor } from "@/components/gospa/RichTextEditor";
import { RichTextView } from "@/components/gospa/RichTextView";
import { Plus, Trash2, Sparkles, ArrowLeft, AlertTriangle, Link2, ExternalLink, Check, X, Pencil, Play } from "lucide-react";
import { toast } from "sonner";
import type { GospaRag, GospaStatus } from "@/lib/gospaService";
import { PresentObjectiveDialog } from "@/components/gospa/PresentObjectiveDialog";
import { encodeLinkEntry, parseLinkEntry, normalizeLinkUrl } from "@/lib/gospaLinkEntry";

const RAGS: GospaRag[] = ["green", "amber", "red"];
const STATUSES: GospaStatus[] = ["not_started", "in_progress", "blocked", "done"];

// Lookup hook: given a set of user_ids, return { [user_id]: displayName }
function useUserNames(userIds: string[]) {
  const ids = useMemo(() => Array.from(new Set(userIds.filter(Boolean))).sort(), [userIds]);
  return useQuery({
    queryKey: ["gospa-user-names", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async () => {
      const map: Record<string, string> = {};
      await Promise.all(ids.map(async (uid) => {
        const { data } = await supabase.rpc("get_safe_profile_info", { target_user_id: uid });
        if (data && data[0]) map[uid] = data[0].name || "Unknown";
        else map[uid] = "Unknown";
      }));
      return map;
    },
  });
}

export default function ObjectiveWorkspace() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { user } = useAuth();
  const currentUserId = user?.id ?? "";
  const objQ = useQuery({ queryKey: ["gospa-obj", id], queryFn: async () => (await gospa.getObjective(id)).data });
  const questionsQ = useQuery({ queryKey: ["gospa-q", id], queryFn: async () => (await gospa.listQuestions(id)).data ?? [] });
  const entriesQ = useQuery({
    queryKey: ["gospa-q-entries", id],
    queryFn: async () => (await gospa.listQuestionEntriesForObjective(id)).data ?? [],
  });
  const stratsQ = useQuery({ queryKey: ["gospa-strat", id], queryFn: async () => (await gospa.listStrategies(id)).data ?? [] });
  const plansQ = useQuery({ queryKey: ["gospa-plans-by-obj", id], queryFn: async () => (await gospa.listPlans()).data ?? [] });
  const actionsQ = useQuery({ queryKey: ["gospa-actions-obj", id], queryFn: async () => (await gospa.listActions({ objectiveId: id })).data ?? [] });
  const metricsQ = useQuery({ queryKey: ["gospa-metrics-obj", id], queryFn: async () => (await gospa.listMetrics(id)).data ?? [] });
  const decisionsQ = useQuery({ queryKey: ["gospa-dec", id], queryFn: async () => (await gospa.listDecisions(id)).data ?? [] });
  const blockersQ = useQuery({ queryKey: ["gospa-block", id], queryFn: async () => (await gospa.listBlockers({ linkedType: "objective", linkedId: id })).data ?? [] });

  const obj = objQ.data;
  const planByStrategy = (sid: string) => (plansQ.data ?? []).filter(p => p.strategy_id === sid);
  const [presentOpen, setPresentOpen] = useState(false);

  // Collect every user_id that owns a question or an entry, so we can resolve names in one go.
  const allOwnerIds = useMemo(() => {
    const ids: string[] = [];
    (questionsQ.data ?? []).forEach((q: any) => { if (q.created_by) ids.push(q.created_by); });
    (entriesQ.data ?? []).forEach((e: any) => { if (e.created_by) ids.push(e.created_by); });
    return ids;
  }, [questionsQ.data, entriesQ.data]);
  const namesQ = useUserNames(allOwnerIds);
  const nameOf = (uid?: string | null) => (uid && namesQ.data?.[uid]) || (uid === currentUserId ? "You" : "—");

  const invalidateEntries = () => qc.invalidateQueries({ queryKey: ["gospa-q-entries", id] });

  if (!obj) return <div className="p-6">Loading…</div>;

  const updateObj = async (patch: any) => {
    const { error } = await gospa.updateObjective(id, patch);
    if (error) toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["gospa-obj", id] });
  };

  return (
    <div className="p-6 space-y-4 max-w-7xl mx-auto">
      <Link to="/app/gospa/goals" className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"><ArrowLeft className="h-3 w-3"/> Back to goals</Link>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Input className="text-2xl font-bold border-0 px-0 h-auto bg-transparent focus-visible:ring-0" defaultValue={obj.title} onBlur={e => e.target.value !== obj.title && updateObj({ title: e.target.value })}/>
          <div className="mt-1">
            <RichTextEditor
              value={obj.description ?? ""}
              placeholder="Description"
              onChange={(html) => {
                if (html === (obj.description ?? "")) return;
                updateObj({ description: html });
              }}
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 items-end">
          <Select value={obj.rag_status} onValueChange={v => updateObj({ rag_status: v })}>
            <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
            <SelectContent>{RAGS.map(r => <SelectItem key={r} value={r}><RAGBadge value={r}/></SelectItem>)}</SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            disabled={!questionsQ.data?.length}
            onClick={() => setPresentOpen(true)}
          >
            <Play className="h-4 w-4 mr-2"/> Present
          </Button>
        </div>
      </div>

      <PresentObjectiveDialog
        open={presentOpen}
        onClose={() => setPresentOpen(false)}
        objectiveTitle={obj.title}
        questions={(questionsQ.data ?? []) as any}
        entries={(entriesQ.data ?? []) as any}
        nameOf={nameOf}
      />

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions">A. Questions</TabsTrigger>
          <TabsTrigger value="direction">B. Direction</TabsTrigger>
          <TabsTrigger value="strategies">C. Strategies</TabsTrigger>
          <TabsTrigger value="plans">D. Plans</TabsTrigger>
          <TabsTrigger value="actions">E. Actions</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="risks">Risks & Decisions</TabsTrigger>
        </TabsList>

        {/* QUESTIONS */}
        <TabsContent value="questions" className="space-y-3">
          <NewItemRow placeholder="Add a question for this objective" onCreate={async (t) => {
            const nextIdx = ((questionsQ.data ?? []).reduce((m, q) => Math.max(m, q.order_index ?? 0), 0)) + 1;
            const { error } = await gospa.createQuestion({ objective_id: id, question_text: t, order_index: nextIdx });
            if (error) return toast.error(error.message);
            qc.invalidateQueries({ queryKey: ["gospa-q", id] });
          }}/>
          <div className="grid md:grid-cols-2 gap-3">
            {(questionsQ.data ?? []).map((q: any) => {
              const ownsQuestion = !q.created_by || q.created_by === currentUserId;
              const entriesFor = (type: "summary"|"risk"|"opportunity"|"link") =>
                (entriesQ.data ?? []).filter((e: any) => e.question_id === q.id && e.entry_type === type);
              return (
                <Card key={q.id}>
                  <CardHeader className="pb-2 flex flex-row items-start gap-2 space-y-0">
                    <span className="text-sm font-semibold mt-2">Q{q.order_index}.</span>
                    <div className="flex-1 space-y-1">
                      <Textarea
                        className="font-medium border-0 px-0 py-1 min-h-0 bg-transparent focus-visible:ring-0 resize-none whitespace-pre-wrap break-words leading-snug disabled:opacity-100 disabled:cursor-default"
                        rows={2}
                        defaultValue={q.question_text}
                        placeholder="Question"
                        disabled={!ownsQuestion}
                        onBlur={e => ownsQuestion && e.target.value !== q.question_text && gospa.updateQuestion(q.id, { question_text: e.target.value }).then(() => qc.invalidateQueries({ queryKey: ["gospa-q", id] }))}
                      />
                      <Badge variant="secondary" className="text-[10px] font-normal">Added by {nameOf(q.created_by)}</Badge>
                    </div>
                    {ownsQuestion && (
                      <Button variant="ghost" size="icon" onClick={() => gospa.deleteQuestion(q.id).then(() => qc.invalidateQueries({ queryKey: ["gospa-q", id] }))}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <EntrySection
                      label="Supporting evidence links" icon={<Link2 className="h-3 w-3"/>}
                      type="link" questionId={q.id} entries={entriesFor("link")}
                      currentUserId={currentUserId} nameOf={nameOf} onChanged={invalidateEntries}
                    />
                    <EntrySection
                      label="Key insights" type="summary" questionId={q.id} entries={entriesFor("summary")}
                      currentUserId={currentUserId} nameOf={nameOf} onChanged={invalidateEntries}
                    />
                  </CardContent>
                </Card>
              );
            })}
            {!questionsQ.data?.length && <div className="text-sm text-muted-foreground md:col-span-2">No questions yet. Add one above.</div>}
          </div>
        </TabsContent>

        {/* DIRECTION */}
        <TabsContent value="direction" className="space-y-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Strategic Direction</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Textarea rows={6} defaultValue={obj.strategic_direction ?? ""} placeholder="What's the strategic direction this objective is taking?" onBlur={e => updateObj({ strategic_direction: e.target.value })}/>
              <Button variant="outline" size="sm" onClick={async () => {
                toast.info("Generating AI summary…");
                const { data, error } = await gospaAI.summariseQuestions(id);
                if (error) return toast.error(error.message);
                toast.success("Summary generated"); qc.invalidateQueries({ queryKey: ["gospa-obj", id] });
              }}><Sparkles className="h-4 w-4 mr-2"/>Generate AI summary from answers</Button>
              {obj.ai_summary && <Card className="bg-muted/40"><CardContent className="pt-4 text-sm whitespace-pre-wrap">{obj.ai_summary}</CardContent></Card>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* STRATEGIES */}
        <TabsContent value="strategies" className="space-y-3">
          <NewItemRow placeholder="New strategy title" onCreate={async (t) => {
            const { error } = await gospa.createStrategy({ objective_id: id, title: t });
            if (error) return toast.error(error.message);
            qc.invalidateQueries({ queryKey: ["gospa-strat", id] });
          }}/>
          {(stratsQ.data ?? []).map(s => (
            <Card key={s.id}>
              <CardContent className="pt-4 flex items-start gap-3">
                <div className="flex-1">
                  <Input
                    className="font-medium border-0 px-0 h-auto bg-transparent"
                    defaultValue={s.title}
                    onBlur={async e => {
                      if (e.target.value === (s.title ?? "")) return;
                      const { error } = await gospa.updateStrategy(s.id, { title: e.target.value });
                      if (error) return toast.error(error.message);
                      toast.success("Strategy saved");
                      qc.invalidateQueries({ queryKey: ["gospa-strat", id] });
                    }}
                  />
                  <Textarea
                    rows={2}
                    className="mt-1"
                    defaultValue={s.description ?? ""}
                    placeholder="Description"
                    onBlur={async e => {
                      if (e.target.value === (s.description ?? "")) return;
                      const { error } = await gospa.updateStrategy(s.id, { description: e.target.value });
                      if (error) return toast.error(error.message);
                      toast.success("Description saved");
                      qc.invalidateQueries({ queryKey: ["gospa-strat", id] });
                    }}
                  />
                </div>
                <Select value={s.status} onValueChange={v => gospa.updateStrategy(s.id, { status: v as GospaStatus }).then(() => qc.invalidateQueries({ queryKey: ["gospa-strat", id] }))}>
                  <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                  <SelectContent>{STATUSES.map(st => <SelectItem key={st} value={st}><StatusPill value={st}/></SelectItem>)}</SelectContent>
                </Select>
                <Select value={s.rag_status} onValueChange={v => gospa.updateStrategy(s.id, { rag_status: v as GospaRag }).then(() => qc.invalidateQueries({ queryKey: ["gospa-strat", id] }))}>
                  <SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
                  <SelectContent>{RAGS.map(r => <SelectItem key={r} value={r}><RAGBadge value={r}/></SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => gospa.deleteStrategy(s.id).then(() => qc.invalidateQueries({ queryKey: ["gospa-strat", id] }))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* PLANS */}
        <TabsContent value="plans" className="space-y-3">
          {(stratsQ.data ?? []).map(s => (
            <Card key={s.id}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{s.title}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <NewItemRow placeholder="New plan under this strategy" onCreate={async (t) => {
                  const { error } = await gospa.createPlan({ strategy_id: s.id, title: t });
                  if (error) return toast.error(error.message);
                  qc.invalidateQueries({ queryKey: ["gospa-plans-by-obj", id] });
                }}/>
                {planByStrategy(s.id).map(p => (
                  <div key={p.id} className="flex items-center gap-2 border rounded-md p-2">
                    <Input className="flex-1 border-0 bg-transparent" defaultValue={p.title} onBlur={e => gospa.updatePlan(p.id, { title: e.target.value })}/>
                    <Input
                      type="date"
                      className="w-36"
                      value={p.start_date ?? ""}
                      onChange={async e => {
                        const v = e.target.value || null;
                        const { error } = await gospa.updatePlan(p.id, { start_date: v });
                        if (error) toast.error("Failed to save start date");
                        qc.invalidateQueries({ queryKey: ["gospa-plans-by-obj", id] });
                      }}
                    />
                    <Input
                      type="date"
                      className="w-36"
                      value={p.end_date ?? ""}
                      onChange={async e => {
                        const v = e.target.value || null;
                        const { error } = await gospa.updatePlan(p.id, { end_date: v });
                        if (error) toast.error("Failed to save end date");
                        qc.invalidateQueries({ queryKey: ["gospa-plans-by-obj", id] });
                      }}
                    />
                    <Select value={p.status} onValueChange={v => gospa.updatePlan(p.id, { status: v as GospaStatus }).then(() => qc.invalidateQueries({ queryKey: ["gospa-plans-by-obj", id] }))}>
                      <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                      <SelectContent>{STATUSES.map(st => <SelectItem key={st} value={st}><StatusPill value={st}/></SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" onClick={() => gospa.deletePlan(p.id).then(() => qc.invalidateQueries({ queryKey: ["gospa-plans-by-obj", id] }))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ACTIONS */}
        <TabsContent value="actions" className="space-y-3">
          <ActionCreator plans={(plansQ.data ?? []).filter(p => stratsQ.data?.some(s => s.id === p.strategy_id))} onCreated={() => qc.invalidateQueries({ queryKey: ["gospa-actions-obj", id] })}/>
          <Card><CardContent className="pt-4 space-y-2">
            {(actionsQ.data ?? []).map(a => (
              <div key={a.id} className="flex items-center gap-2 border rounded-md p-2">
                <Input className="flex-1 border-0 bg-transparent" defaultValue={a.task_title} onBlur={e => gospa.updateAction(a.id, { task_title: e.target.value })}/>
                <Input type="date" className="w-36" defaultValue={a.planned_end ?? ""} onBlur={e => gospa.updateAction(a.id, { planned_end: e.target.value || null })}/>
                <Select value={a.status} onValueChange={v => gospa.updateAction(a.id, { status: v as any }).then(() => qc.invalidateQueries({ queryKey: ["gospa-actions-obj", id] }))}>
                  <SelectTrigger className="w-32"><SelectValue/></SelectTrigger>
                  <SelectContent>{["Planned","In Progress","Done","Blocked"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => gospa.deleteAction(a.id).then(() => qc.invalidateQueries({ queryKey: ["gospa-actions-obj", id] }))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
              </div>
            ))}
            {!actionsQ.data?.length && <div className="text-sm text-muted-foreground">No actions yet.</div>}
          </CardContent></Card>
        </TabsContent>

        {/* METRICS */}
        <TabsContent value="metrics" className="space-y-3">
          <NewItemRow placeholder="New metric name" onCreate={async (t) => {
            const { error } = await gospa.createMetric({ objective_id: id, name: t });
            if (error) return toast.error(error.message);
            qc.invalidateQueries({ queryKey: ["gospa-metrics-obj", id] });
          }}/>
          {(metricsQ.data ?? []).map(m => (
            <Card key={m.id}><CardContent className="pt-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <Input className="md:col-span-2" defaultValue={m.name} onBlur={e => gospa.updateMetric(m.id, { name: e.target.value })}/>
              <Input type="number" placeholder="Target" defaultValue={m.target_value ?? ""} onBlur={e => gospa.updateMetric(m.id, { target_value: Number(e.target.value) || null })}/>
              <Input type="number" placeholder="Current" defaultValue={m.current_value ?? ""} onBlur={e => {
                const v = Number(e.target.value);
                if (!isNaN(v)) gospa.recordMetricValue(m.id, v).then(() => qc.invalidateQueries({ queryKey: ["gospa-metrics-obj", id] }));
              }}/>
              <Input placeholder="Unit" defaultValue={m.unit ?? ""} onBlur={e => gospa.updateMetric(m.id, { unit: e.target.value })}/>
              <Button variant="ghost" size="icon" onClick={() => gospa.deleteMetric(m.id).then(() => qc.invalidateQueries({ queryKey: ["gospa-metrics-obj", id] }))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
            </CardContent></Card>
          ))}
        </TabsContent>

        {/* RISKS & DECISIONS */}
        <TabsContent value="risks" className="grid md:grid-cols-2 gap-3">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4"/> Blockers</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <NewItemRow placeholder="New blocker description" onCreate={async (t) => {
                const { error } = await gospa.createBlocker({ description: t, linked_type: "objective", linked_id: id });
                if (error) return toast.error(error.message);
                qc.invalidateQueries({ queryKey: ["gospa-block", id] });
              }}/>
              {(blockersQ.data ?? []).map(b => (
                <div key={b.id} className="flex items-center gap-2 border rounded-md p-2">
                  <Input className="flex-1" defaultValue={b.description} onBlur={e => gospa.updateBlocker(b.id, { description: e.target.value })}/>
                  <Select value={b.severity} onValueChange={v => gospa.updateBlocker(b.id, { severity: v as any }).then(() => qc.invalidateQueries({ queryKey: ["gospa-block", id] }))}>
                    <SelectTrigger className="w-28"><SelectValue/></SelectTrigger>
                    <SelectContent>{["low","medium","high","critical"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => gospa.deleteBlocker(b.id).then(() => qc.invalidateQueries({ queryKey: ["gospa-block", id] }))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Decisions</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <NewItemRow placeholder="Log a decision" onCreate={async (t) => {
                const { error } = await gospa.createDecision({ objective_id: id, description: t });
                if (error) return toast.error(error.message);
                qc.invalidateQueries({ queryKey: ["gospa-dec", id] });
              }}/>
              {(decisionsQ.data ?? []).map(d => (
                <div key={d.id} className="flex items-center gap-2 border rounded-md p-2">
                  <Input className="flex-1" defaultValue={d.description} onBlur={e => gospa.updateDecision(d.id, { description: e.target.value })}/>
                  <span className="text-xs text-muted-foreground">{d.decision_date}</span>
                  <Button variant="ghost" size="icon" onClick={() => gospa.deleteDecision(d.id).then(() => qc.invalidateQueries({ queryKey: ["gospa-dec", id] }))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewItemRow({ placeholder, onCreate }: { placeholder: string; onCreate: (text: string) => any }) {
  const [t, setT] = useState("");
  return (
    <div className="flex gap-2">
      <Input placeholder={placeholder} value={t} onChange={e => setT(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && t.trim()) { onCreate(t.trim()); setT(""); } }}/>
      <Button onClick={() => { if (t.trim()) { onCreate(t.trim()); setT(""); } }}><Plus className="h-4 w-4"/></Button>
    </div>
  );
}

function ActionCreator({ plans, onCreated }: { plans: any[]; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [planId, setPlanId] = useState("");
  const [date, setDate] = useState("");
  return (
    <Card><CardContent className="pt-4 flex items-center gap-2">
      <Input placeholder="New action title" value={title} onChange={e => setTitle(e.target.value)} className="flex-1"/>
      <Select value={planId} onValueChange={setPlanId}>
        <SelectTrigger className="w-48"><SelectValue placeholder="Pick a plan"/></SelectTrigger>
        <SelectContent>{plans.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}</SelectContent>
      </Select>
      <Input type="date" className="w-40" value={date} onChange={e => setDate(e.target.value)}/>
      <Button onClick={async () => {
        if (!title.trim() || !planId) return toast.error("Title and plan required");
        const { error } = await gospa.createAction({ task_title: title, gospa_plan_id: planId, planned_end: date || null });
        if (error) return toast.error(error.message);
        setTitle(""); setDate(""); onCreated();
      }}><Plus className="h-4 w-4 mr-1"/>Add</Button>
    </CardContent></Card>
  );
}

type EntryType = "summary" | "risk" | "opportunity" | "link";

const PLACEHOLDERS: Record<EntryType, string> = {
  summary: "Add a key insight",
  risk: "Add a risk",
  opportunity: "Add an opportunity",
  link: "Paste a link (https://…)",
};

const normalizeUrl = (raw: string) => {
  const t = raw.trim();
  if (!t) return "";
  return /^https?:\/\//i.test(t) ? t : `https://${t}`;
};

function EntrySection({
  label, icon, type, questionId, entries, currentUserId, nameOf, onChanged,
}: {
  label: string;
  icon?: React.ReactNode;
  type: EntryType;
  questionId: string;
  entries: any[];
  currentUserId: string;
  nameOf: (uid?: string | null) => string;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [linkNameDraft, setLinkNameDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editLinkName, setEditLinkName] = useState("");

  const isEmptyHtml = (s: string) => !s || s.replace(/<[^>]+>/g, "").trim() === "";

  const add = async () => {
    let v: string;
    if (type === "link") {
      const url = normalizeLinkUrl(draft);
      if (!url) return;
      v = encodeLinkEntry(linkNameDraft, url);
    } else if (type === "summary") {
      v = isEmptyHtml(draft) ? "" : draft;
    } else {
      v = draft.trim();
    }
    if (!v) return;
    const { error } = await gospa.createQuestionEntry({ question_id: questionId, entry_type: type, content: v });
    if (error) return toast.error(error.message);
    setDraft("");
    setLinkNameDraft("");
    onChanged();
  };

  const save = async (id: string) => {
    let v: string;
    if (type === "link") {
      const url = normalizeLinkUrl(editValue);
      if (!url) return;
      v = encodeLinkEntry(editLinkName, url);
    } else if (type === "summary") {
      v = isEmptyHtml(editValue) ? "" : editValue;
    } else {
      v = editValue.trim();
    }
    if (!v) return;
    const { error } = await gospa.updateQuestionEntry(id, v);
    if (error) return toast.error(error.message);
    setEditingId(null);
    onChanged();
  };

  const remove = async (id: string) => {
    const { error } = await gospa.deleteQuestionEntry(id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  const beginEdit = (e: any) => {
    if (type === "link") {
      const parsed = parseLinkEntry(e.content);
      setEditingId(e.id);
      setEditValue(parsed.url);
      setEditLinkName(parsed.name);
    } else {
      setEditingId(e.id);
      setEditValue(e.content);
    }
  };

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {icon} {label}
      </div>
      {entries.length > 0 && (
        <ul className="space-y-1">
          {entries.map(e => {
            const mine = e.created_by === currentUserId;
            const isEditing = editingId === e.id;
            return (
              <li key={e.id} className="flex items-start gap-2 border rounded-md px-2 py-1 bg-muted/30">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    type === "summary" ? (
                      <RichTextEditor
                        value={editValue}
                        onChange={setEditValue}
                        placeholder="Edit key insight…"
                        autoFocus
                      />
                    ) : type === "link" ? (
                      <div className="space-y-2">
                        <Input
                          value={editLinkName}
                          onChange={ev => setEditLinkName(ev.target.value)}
                          placeholder="Link name (optional)"
                          className="text-sm h-8"
                          autoFocus
                        />
                        <Input
                          value={editValue}
                          onChange={ev => setEditValue(ev.target.value)}
                          placeholder="https://example.com"
                          className="text-sm h-8"
                          type="url"
                        />
                      </div>
                    ) : (
                      <Textarea
                        value={editValue}
                        onChange={ev => setEditValue(ev.target.value)}
                        rows={2}
                        className="text-sm"
                        autoFocus
                      />
                    )
                  ) : type === "link" ? (() => {
                    const parsed = parseLinkEntry(e.content);
                    const display = parsed.name || parsed.url;
                    return (
                      <a href={parsed.url} target="_blank" rel="noopener noreferrer"
                         className="text-sm text-primary hover:underline inline-flex items-center gap-1 break-all"
                         title={parsed.url}>
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="break-all">{display}</span>
                      </a>
                    );
                  })() : type === "summary" ? (
                    <RichTextView html={e.content} className="text-sm" />
                  ) : (
                    <div className="text-sm whitespace-pre-wrap break-words">{e.content}</div>
                  )}
                  <Badge variant="secondary" className="text-[10px] font-normal mt-1">
                    Added by {nameOf(e.created_by)}
                  </Badge>
                </div>
                {mine && !isEditing && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => beginEdit(e)}>
                      <Pencil className="h-3 w-3"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => remove(e.id)}>
                      <Trash2 className="h-3 w-3 text-destructive"/>
                    </Button>
                  </div>
                )}
                {mine && isEditing && (
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => save(e.id)}>
                      <Check className="h-3 w-3"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3"/>
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {type === "summary" ? (
        <div className="space-y-2">
          <RichTextEditor
            value={draft}
            onChange={setDraft}
            placeholder={PLACEHOLDERS[type]}
          />
          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={add}>
              <Plus className="h-4 w-4 mr-1"/> Add insight
            </Button>
          </div>
        </div>
      ) : type === "link" ? (
        <div className="space-y-2">
          <Input
            placeholder="Link name (optional)"
            value={linkNameDraft}
            onChange={e => setLinkNameDraft(e.target.value)}
            className="h-9"
          />
          <div className="flex gap-2">
            <Input
              placeholder={PLACEHOLDERS[type]}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            />
            <Button type="button" variant="outline" size="sm" onClick={add}>
              <Plus className="h-4 w-4"/>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            placeholder={PLACEHOLDERS[type]}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={add}>
            <Plus className="h-4 w-4"/>
          </Button>
        </div>
      )}
    </div>
  );
}
