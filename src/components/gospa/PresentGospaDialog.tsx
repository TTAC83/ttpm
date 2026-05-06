import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Home, ChevronLeft, ChevronRight, ChevronDown, Target, Lightbulb, Link2, Maximize2, Minimize2, Map, ListChecks, CheckCircle2, Clock, AlertTriangle, Expand, Shrink, BarChart3, ZoomIn, ZoomOut, Calendar } from "lucide-react";
import { computeBounds, generateDateMarkers, generateMonthBands, dateToX } from "@/features/gospa-gantt/buildTimeline";
import { gospa } from "@/lib/gospaService";
import { supabase } from "@/integrations/supabase/client";
import { RichTextView } from "./RichTextView";
import { RAGBadge } from "./RAGBadge";
import thingtraxLogoFull from "@/assets/thingtrax-logo-full.png";

/* ── Types ─────────────────────────────────────────────────────── */

interface GoalData {
  id: string;
  title: string;
  description?: string | null;
  timeframe_start?: string | null;
  timeframe_end?: string | null;
}

interface ObjectiveData {
  id: string;
  title: string;
  description?: string | null;
  rag_status?: string | null;
  target_outcome?: string | null;
  order_index?: number | null;
}

interface StrategyData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  rag_status: string;
  objective_id: string;
}

interface PlanData {
  id: string;
  title: string;
  strategy_id: string;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  description?: string | null;
}

interface ActionData {
  id: string;
  task_title: string;
  status: string;
  planned_start?: string | null;
  planned_end?: string | null;
  assignee?: string | null;
  gospa_plan_id?: string | null;
  gospa_objective_id?: string | null;
  gospa_strategy_id?: string | null;
}

interface QuestionData {
  id: string;
  question_text: string;
  order_index: number;
  objective_id: string;
  created_by?: string | null;
}

interface EntryData {
  id: string;
  question_id: string;
  entry_type: "summary" | "risk" | "opportunity" | "link" | "key_insight";
  content: string;
  created_by?: string | null;
}

/* ── View states ───────────────────────────────────────────────── */

type ViewState =
  | { type: "home" }
  | { type: "objective"; objectiveId: string }
  | { type: "question"; objectiveId: string; questionId: string }
  | { type: "strategy"; strategyId: string; objectiveId: string }
  | { type: "plan"; planId: string; objectiveId: string }
  | { type: "action"; actionId: string; objectiveId: string };

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  goal: GoalData;
  objectives: ObjectiveData[];
  strategies: StrategyData[];
  plans: PlanData[];
  actions: ActionData[];
}

/* ── Helpers ───────────────────────────────────────────────────── */

function useUserNames(userIds: string[]) {
  const ids = useMemo(() => Array.from(new Set(userIds.filter(Boolean))).sort(), [userIds]);
  return useQuery({
    queryKey: ["gospa-present-names", ids.join(",")],
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

const ragDot = (rag?: string | null) => {
  const color = rag === "green" ? "bg-green-400" : rag === "amber" ? "bg-amber-400" : rag === "red" ? "bg-red-400" : "bg-white/30";
  return <span className={`inline-block w-3 h-3 rounded-full ${color}`} />;
};

const ragBorderColor = (rag?: string | null) => {
  if (rag === "green") return "border-l-green-400";
  if (rag === "amber") return "border-l-amber-400";
  if (rag === "red") return "border-l-red-400";
  return "border-l-white/20";
};

const statusDot = (s: string) => {
  if (s === "Done" || s === "done") return "bg-green-400";
  if (s === "In Progress" || s === "in_progress") return "bg-blue-400";
  if (s === "Blocked" || s === "blocked") return "bg-red-400";
  return "bg-white/30";
};

const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

/* ── Component ─────────────────────────────────────────────────── */

export function PresentGospaDialog({ open, onClose, goal, objectives, strategies, plans, actions }: Props) {
  const [view, setView] = useState<ViewState>({ type: "home" });
  const [history, setHistory] = useState<ViewState[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch questions & entries for ALL objectives upfront
  const allQuestionsQ = useQuery({
    queryKey: ["gospa-present-all-questions"],
    enabled: open,
    queryFn: async () => {
      const results: QuestionData[] = [];
      for (const obj of objectives) {
        const { data } = await gospa.listQuestions(obj.id);
        if (data) results.push(...(data as QuestionData[]));
      }
      return results;
    },
  });

  const allEntriesQ = useQuery({
    queryKey: ["gospa-present-all-entries"],
    enabled: open && (allQuestionsQ.data?.length ?? 0) > 0,
    queryFn: async () => {
      const results: EntryData[] = [];
      for (const obj of objectives) {
        const { data } = await gospa.listQuestionEntriesForObjective(obj.id);
        if (data) results.push(...(data as EntryData[]));
      }
      return results;
    },
  });

  const allOwnerIds = useMemo(() => {
    const ids: string[] = [];
    (allQuestionsQ.data ?? []).forEach(q => { if (q.created_by) ids.push(q.created_by); });
    (allEntriesQ.data ?? []).forEach(e => { if (e.created_by) ids.push(e.created_by); });
    return ids;
  }, [allQuestionsQ.data, allEntriesQ.data]);
  const namesQ = useUserNames(allOwnerIds);
  const nameOf = (uid?: string | null) => (uid && namesQ.data?.[uid]) || "—";

  const questions = allQuestionsQ.data ?? [];
  const entries = allEntriesQ.data ?? [];

  // Navigation helpers
  const navigate = useCallback((next: ViewState) => {
    setHistory(h => [...h, view]);
    setView(next);
  }, [view]);

  const goBack = useCallback(() => {
    setHistory(h => {
      const copy = [...h];
      const prev = copy.pop();
      if (prev) setView(prev);
      return copy;
    });
  }, []);

  const goHome = useCallback(() => {
    setHistory([]);
    setView({ type: "home" });
  }, []);

  // Reset on open
  useEffect(() => {
    if (open) {
      setView({ type: "home" });
      setHistory([]);
    }
  }, [open]);

  // Fullscreen
  useEffect(() => {
    if (!open) return;
    const el = containerRef.current;
    let enteredFullscreen = false;
    if (el?.requestFullscreen) {
      el.requestFullscreen().then(() => { enteredFullscreen = true; }).catch(() => {});
    }
    const onFsChange = () => {
      if (enteredFullscreen && !document.fullscreenElement) onClose();
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    };
  }, [open, onClose]);

  // Keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Backspace" && history.length > 0) { e.preventDefault(); goBack(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goBack, history.length]);

  if (!open) return null;

  const currentObjective = (view.type !== "home")
    ? objectives.find(o => o.id === (view as any).objectiveId)
    : null;

  // Breadcrumb text
  const breadcrumb = (() => {
    if (view.type === "home") return "GOSPA Overview";
    if (view.type === "objective") return currentObjective?.title ?? "";
    if (view.type === "question") {
      const q = questions.find(q => q.id === view.questionId);
      return q ? `Q${q.order_index}: ${q.question_text.slice(0, 50)}...` : "Question";
    }
    if (view.type === "strategy") {
      const s = strategies.find(s => s.id === view.strategyId);
      return s ? `Strategy: ${s.title}` : "Strategy";
    }
    if (view.type === "plan") {
      const p = plans.find(p => p.id === view.planId);
      return p ? `Plan: ${p.title}` : "Plan";
    }
    if (view.type === "action") {
      const a = actions.find(a => a.id === view.actionId);
      return a ? `Action: ${a.task_title}` : "Action";
    }
    return "";
  })();

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex bg-thingtrax-black text-white"
    >
      {/* ── Left Navigation Panel ─────────────────────────────── */}
      <nav className="w-72 shrink-0 flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm">
        <div className="px-6 py-5 border-b border-white/10">
          <img src={thingtraxLogoFull} alt="Thingtrax" className="h-8" />
        </div>

        <div className="px-4 py-3 space-y-1">
          <button
            onClick={goHome}
            className={`w-full flex items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
              view.type === "home"
                ? "bg-thingtrax-green/20 text-thingtrax-green border border-thingtrax-green/30"
                : "text-white/70 hover:text-white hover:bg-white/5"
            }`}
          >
            <Home className="h-5 w-5 shrink-0" />
            <span className="font-medium">Home</span>
          </button>

          {history.length > 0 && (
            <button
              onClick={goBack}
              className="w-full flex items-center gap-3 rounded-lg px-4 py-2.5 text-left text-white/50 hover:text-white hover:bg-white/5 transition-all"
            >
              <ChevronLeft className="h-5 w-5 shrink-0" />
              <span className="text-sm">Back</span>
            </button>
          )}
        </div>

        <div className="px-4 pt-2 pb-1">
          <div className="text-xs text-white/40 uppercase tracking-widest font-semibold px-4 mb-2">
            Objectives
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {objectives.map((obj, i) => {
            const isActive = view.type !== "home" && (view as any).objectiveId === obj.id;
            return (
              <button
                key={obj.id}
                onClick={() => navigate({ type: "objective", objectiveId: obj.id })}
                className={`w-full flex items-start gap-3 rounded-lg px-4 py-3 text-left transition-all ${
                  isActive
                    ? "bg-thingtrax-green/15 text-thingtrax-green border border-thingtrax-green/20"
                    : "text-white/70 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className={`flex items-center justify-center rounded-md w-7 h-7 text-xs font-bold shrink-0 mt-0.5 ${
                  isActive ? "bg-thingtrax-green/30 text-thingtrax-green" : "bg-white/10 text-white/50"
                }`}>
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight line-clamp-2">{obj.title}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {ragDot(obj.rag_status)}
                    <span className="text-xs text-white/40 capitalize">{obj.rag_status || "—"}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Main Content ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
          <div className="text-sm text-white/50 truncate max-w-[60%]">{breadcrumb}</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(e => !e)}
              className="rounded-md p-2 hover:bg-white/10 transition-colors"
            >
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button onClick={onClose} className="rounded-md p-2 hover:bg-white/10 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <div className={`mx-auto py-10 transition-all ${isExpanded ? "max-w-none px-12" : "max-w-[1400px] px-10"}`}>
            {view.type === "home" && (
              <GospaTreeView
                goal={goal}
                objectives={objectives}
                strategies={strategies}
                plans={plans}
                actions={actions}
                onNavigate={navigate}
              />
            )}
            {view.type === "objective" && currentObjective && (
              <ObjectiveView
                objective={currentObjective}
                questions={questions.filter(q => q.objective_id === currentObjective.id)}
                entries={entries}
                nameOf={nameOf}
                onSelectQuestion={(qId) => navigate({ type: "question", objectiveId: currentObjective.id, questionId: qId })}
                isExpanded={isExpanded}
              />
            )}
            {view.type === "question" && (
              <QuestionDetailView
                question={questions.find(q => q.id === view.questionId)!}
                entries={entries.filter(e => e.question_id === view.questionId)}
                nameOf={nameOf}
                isExpanded={isExpanded}
              />
            )}
            {view.type === "strategy" && (
              <StrategyDetailView
                strategy={strategies.find(s => s.id === view.strategyId)!}
                plans={plans.filter(p => p.strategy_id === view.strategyId)}
                actions={actions}
                onNavigate={navigate}
                objectiveId={view.objectiveId}
                isExpanded={isExpanded}
              />
            )}
            {view.type === "plan" && (
              <PlanDetailView
                plan={plans.find(p => p.id === view.planId)!}
                actions={actions.filter(a => a.gospa_plan_id === view.planId)}
                onNavigate={navigate}
                objectiveId={view.objectiveId}
                isExpanded={isExpanded}
              />
            )}
            {view.type === "action" && (
              <ActionDetailView
                action={actions.find(a => a.id === view.actionId)!}
                nameOf={nameOf}
                isExpanded={isExpanded}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   GOSPA TREE VIEW — Visual Hierarchy Home Page
   ═══════════════════════════════════════════════════════════════════ */

function GospaTreeView({ goal, objectives, strategies, plans, actions, onNavigate }: {
  goal: GoalData;
  objectives: ObjectiveData[];
  strategies: StrategyData[];
  plans: PlanData[];
  actions: ActionData[];
  onNavigate: (v: ViewState) => void;
}) {
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());

  const toggleObjective = (id: string) => {
    setExpandedObjectives(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpandedObjectives(new Set(objectives.map(o => o.id)));
  const collapseAll = () => setExpandedObjectives(new Set());
  const allExpanded = objectives.length > 0 && expandedObjectives.size === objectives.length;

  // Find the deepest level present for any expanded objective to know which columns to show
  const hasAnyExpanded = expandedObjectives.size > 0;

  // Column headers
  const columns = hasAnyExpanded
    ? ["Goal", "Objectives", "Strategies", "Plans", "Actions"]
    : ["Goal", "Objectives"];

  return (
    <div>
      {/* Hero header */}
      <div className="text-center mb-8">
        <div className="inline-block mb-3">
          <img src={thingtraxLogoFull} alt="Thingtrax" className="h-10 opacity-70" />
        </div>
        <div className="rounded-full px-5 py-1.5 mb-4 border border-thingtrax-green/30 text-thingtrax-green uppercase tracking-[0.2em] text-sm font-medium inline-block">
          GOSPA Strategic Plan
        </div>
        {(goal.timeframe_start || goal.timeframe_end) && (
          <div className="flex items-center justify-center gap-3 text-white/40 text-sm mb-2">
            <span>{goal.timeframe_start ?? "—"}</span>
            <span className="text-thingtrax-green">→</span>
            <span>{goal.timeframe_end ?? "—"}</span>
          </div>
        )}
      </div>

      {/* Expand/Collapse all */}
      <div className="flex justify-end mb-4">
        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors px-3 py-1.5 rounded-md border border-white/10 hover:border-white/20"
        >
          {allExpanded ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          {allExpanded ? "Collapse All" : "Expand All"}
        </button>
      </div>

      {/* Column headers */}
      <div className={`grid gap-px mb-3 ${hasAnyExpanded ? "grid-cols-5" : "grid-cols-2"}`}>
        {columns.map(col => (
          <div key={col} className="text-center text-[10px] text-white/30 uppercase tracking-[0.15em] font-semibold py-2">
            {col}
          </div>
        ))}
      </div>

      {/* Tree rows — one row per objective */}
      <div className="space-y-3">
        {objectives.map((obj, oi) => {
          const isExpObjExpanded = expandedObjectives.has(obj.id);
          const objStrats = strategies.filter(s => s.objective_id === obj.id);

          return (
            <div key={obj.id}>
              <div className={`grid gap-0 ${hasAnyExpanded ? "grid-cols-5" : "grid-cols-2"}`}>
                {/* Goal column — only show in first row */}
                <div className="flex items-start justify-center px-2">
                  {oi === 0 && (
                    <div className="rounded-2xl bg-gradient-to-br from-thingtrax-green/20 to-thingtrax-green/5 border-2 border-thingtrax-green/40 p-5 backdrop-blur-sm w-full">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="h-5 w-5 text-thingtrax-green" />
                        <span className="text-xs text-thingtrax-green uppercase tracking-widest font-semibold">Goal</span>
                      </div>
                      <h2 className="text-lg font-bold text-white leading-tight mb-1">{goal.title}</h2>
                      {goal.description && (
                        <p className="text-xs text-white/50 line-clamp-3">{goal.description}</p>
                      )}
                    </div>
                  )}
                  {oi !== 0 && (
                    <div className="w-px h-full bg-thingtrax-green/15 mx-auto" />
                  )}
                </div>

                {/* Objective column */}
                <div className="flex items-start px-2">
                  <div className="w-full">
                    <button
                      onClick={() => toggleObjective(obj.id)}
                      className={`w-full group rounded-xl bg-white/5 border border-white/10 border-l-4 ${ragBorderColor(obj.rag_status)} p-4 text-left hover:bg-white/8 hover:border-white/20 transition-all`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="flex items-center justify-center rounded-md w-6 h-6 text-xs font-bold bg-white/10 text-white/60">
                            {oi + 1}
                          </span>
                          <span className="text-[10px] text-white/40 uppercase tracking-widest">Objective</span>
                          {ragDot(obj.rag_status)}
                        </div>
                        <ChevronDown className={`h-4 w-4 text-white/30 transition-transform ${isExpObjExpanded ? "rotate-180" : ""}`} />
                      </div>
                      <div className="text-sm font-semibold text-white group-hover:text-thingtrax-green transition-colors leading-snug">
                        {obj.title}
                      </div>
                    </button>
                    {/* Click to navigate to detail */}
                    <button
                      onClick={() => onNavigate({ type: "objective", objectiveId: obj.id })}
                      className="mt-1 text-[10px] text-white/30 hover:text-thingtrax-green transition-colors pl-2"
                    >
                      View detail →
                    </button>
                  </div>
                </div>

                {/* Strategies column */}
                {hasAnyExpanded && (
                  <div className="flex items-start px-2">
                    {isExpObjExpanded && objStrats.length > 0 ? (
                      <div className="space-y-2 w-full">
                        {objStrats.map(strat => (
                          <button
                            key={strat.id}
                            onClick={() => onNavigate({ type: "strategy", strategyId: strat.id, objectiveId: obj.id })}
                            className="w-full group rounded-lg bg-white/[0.04] border border-white/10 p-3 text-left hover:bg-white/8 hover:border-thingtrax-cyan/30 transition-all"
                          >
                            <div className="flex items-center gap-2 mb-1.5">
                              <Map className="h-3.5 w-3.5 text-thingtrax-cyan/70" />
                              <span className="text-[10px] text-white/30 uppercase tracking-widest">Strategy</span>
                              {ragDot(strat.rag_status)}
                            </div>
                            <div className="text-xs font-medium text-white/80 group-hover:text-thingtrax-cyan transition-colors line-clamp-2 leading-snug">
                              {strat.title}
                            </div>
                            <span className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${statusDot(strat.status) === "bg-green-400" ? "bg-green-500/20 text-green-400" : "bg-white/10 text-white/50"}`}>
                              {statusLabel(strat.status)}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : isExpObjExpanded ? (
                      <div className="text-xs text-white/20 italic px-2 pt-4">No strategies</div>
                    ) : null}
                  </div>
                )}

                {/* Plans column */}
                {hasAnyExpanded && (
                  <div className="flex items-start px-2">
                    {isExpObjExpanded && (() => {
                      const objPlans = objStrats.flatMap(s => plans.filter(p => p.strategy_id === s.id));
                      if (objPlans.length === 0) return <div className="text-xs text-white/20 italic px-2 pt-4">No plans</div>;
                      return (
                        <div className="space-y-2 w-full">
                          {objPlans.map(plan => {
                            const planActions = actions.filter(a => a.gospa_plan_id === plan.id);
                            const doneCount = planActions.filter(a => a.status === "Done" || a.status === "done").length;
                            return (
                              <button
                                key={plan.id}
                                onClick={() => onNavigate({ type: "plan", planId: plan.id, objectiveId: obj.id })}
                                className="w-full group rounded-md bg-white/[0.03] border border-white/8 p-2.5 text-left hover:bg-white/6 hover:border-thingtrax-yellow/30 transition-all"
                              >
                                <div className="flex items-center gap-1.5 mb-1">
                                  <ListChecks className="h-3 w-3 text-thingtrax-yellow/60" />
                                  <span className="text-[9px] text-white/25 uppercase tracking-widest">Plan</span>
                                </div>
                                <div className="text-[11px] font-medium text-white/70 group-hover:text-thingtrax-yellow transition-colors line-clamp-2 leading-snug">
                                  {plan.title}
                                </div>
                                {planActions.length > 0 && (
                                  <div className="mt-1.5 flex items-center gap-1.5">
                                    <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
                                      <div className="h-full rounded-full bg-thingtrax-green/60" style={{ width: `${(doneCount / planActions.length) * 100}%` }} />
                                    </div>
                                    <span className="text-[9px] text-white/30">{doneCount}/{planActions.length}</span>
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Actions column */}
                {hasAnyExpanded && (
                  <div className="flex items-start px-2">
                    {isExpObjExpanded && (() => {
                      const objActions = objStrats.flatMap(s =>
                        plans.filter(p => p.strategy_id === s.id).flatMap(p =>
                          actions.filter(a => a.gospa_plan_id === p.id)
                        )
                      );
                      if (objActions.length === 0) return <div className="text-xs text-white/20 italic px-2 pt-4">No actions</div>;
                      return (
                        <div className="space-y-1 w-full">
                          {objActions.slice(0, 8).map(action => (
                            <button
                              key={action.id}
                              onClick={() => onNavigate({ type: "action", actionId: action.id, objectiveId: obj.id })}
                              className="w-full group flex items-center gap-2 rounded bg-white/[0.02] border border-white/5 px-2.5 py-1.5 text-left hover:bg-white/5 hover:border-white/15 transition-all"
                            >
                              <span className={`w-2 h-2 rounded-full shrink-0 ${statusDot(action.status)}`} />
                              <span className="text-[10px] text-white/50 group-hover:text-white/80 transition-colors truncate">
                                {action.task_title}
                              </span>
                            </button>
                          ))}
                          {objActions.length > 8 && (
                            <div className="text-[9px] text-white/25 pl-5">+{objActions.length - 8} more</div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-8 mt-8 text-[11px] text-white/30">
        <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-thingtrax-green" /> Goal</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded border-l-2 border-l-green-400 bg-white/5" /> Objective</div>
        <div className="flex items-center gap-2"><Map className="h-3.5 w-3.5 text-thingtrax-cyan/60" /> Strategy</div>
        <div className="flex items-center gap-2"><ListChecks className="h-3.5 w-3.5 text-thingtrax-yellow/60" /> Plan</div>
        <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white/30" /> Action</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   STRATEGY DETAIL VIEW
   ═══════════════════════════════════════════════════════════════════ */

function StrategyDetailView({ strategy, plans: stratPlans, actions, onNavigate, objectiveId, isExpanded }: {
  strategy: StrategyData;
  plans: PlanData[];
  actions: ActionData[];
  onNavigate: (v: ViewState) => void;
  objectiveId: string;
  isExpanded: boolean;
}) {
  if (!strategy) return null;
  return (
    <div>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full px-4 py-1 border border-thingtrax-cyan/30 text-thingtrax-cyan uppercase tracking-widest text-xs">
            Strategy
          </div>
          <RAGBadge value={strategy.rag_status as any} />
          <span className={`rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-white/60`}>{statusLabel(strategy.status)}</span>
        </div>
        <h1 className={`font-bold leading-tight text-white mb-4 ${isExpanded ? "text-5xl" : "text-4xl"}`}>
          {strategy.title}
        </h1>
        {strategy.description && (
          <div className="text-white/60 text-lg max-w-3xl">
            <RichTextView html={strategy.description} className="text-white/60" />
          </div>
        )}
      </div>

      {stratPlans.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-thingtrax-yellow uppercase tracking-widest text-sm font-semibold mb-6">
            <ListChecks className="h-5 w-5" />
            Plans ({stratPlans.length})
          </div>
          <div className="space-y-3">
            {stratPlans.map(p => {
              const planActions = actions.filter(a => a.gospa_plan_id === p.id);
              const doneCount = planActions.filter(a => a.status === "Done" || a.status === "done").length;
              const pct = planActions.length ? Math.round((doneCount / planActions.length) * 100) : 0;
              return (
                <button
                  key={p.id}
                  onClick={() => onNavigate({ type: "plan", planId: p.id, objectiveId })}
                  className="w-full group rounded-xl bg-white/5 border border-white/10 px-6 py-5 text-left hover:border-thingtrax-yellow/40 hover:bg-thingtrax-yellow/5 transition-all flex items-center gap-4"
                >
                  <ListChecks className="h-5 w-5 text-thingtrax-yellow/60 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium text-white group-hover:text-thingtrax-yellow transition-colors ${isExpanded ? "text-xl" : "text-lg"}`}>
                      {p.title}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-white/40">
                      {(p.start_date || p.end_date) && (
                        <span>{p.start_date ?? "?"} → {p.end_date ?? "?"}</span>
                      )}
                      <span>{statusLabel(p.status)}</span>
                      {planActions.length > 0 && <span>{doneCount}/{planActions.length} actions ({pct}%)</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-thingtrax-yellow shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PLAN DETAIL VIEW
   ═══════════════════════════════════════════════════════════════════ */

function PlanDetailView({ plan, actions: planActions, onNavigate, objectiveId, isExpanded }: {
  plan: PlanData;
  actions: ActionData[];
  onNavigate: (v: ViewState) => void;
  objectiveId: string;
  isExpanded: boolean;
}) {
  if (!plan) return null;
  const doneCount = planActions.filter(a => a.status === "Done" || a.status === "done").length;
  const pct = planActions.length ? Math.round((doneCount / planActions.length) * 100) : 0;

  return (
    <div>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full px-4 py-1 border border-thingtrax-yellow/30 text-thingtrax-yellow uppercase tracking-widest text-xs">
            Plan
          </div>
          <span className="rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-white/60">{statusLabel(plan.status)}</span>
        </div>
        <h1 className={`font-bold leading-tight text-white mb-4 ${isExpanded ? "text-5xl" : "text-4xl"}`}>
          {plan.title}
        </h1>
        {(plan.start_date || plan.end_date) && (
          <div className="flex items-center gap-3 text-white/40 text-lg mb-4">
            <Clock className="h-5 w-5" />
            <span>{plan.start_date ?? "?"} → {plan.end_date ?? "?"}</span>
          </div>
        )}
        {plan.description && (
          <div className="text-white/60 text-lg max-w-3xl">
            <RichTextView html={plan.description} className="text-white/60" />
          </div>
        )}
      </div>

      {/* Progress bar */}
      {planActions.length > 0 && (
        <div className="mb-8 rounded-xl bg-white/5 border border-white/10 p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-white/50">Progress</span>
            <span className="text-lg font-bold text-thingtrax-green">{pct}%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden">
            <div className="h-full rounded-full bg-thingtrax-green transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-sm text-white/40">{doneCount} of {planActions.length} actions complete</div>
        </div>
      )}

      {/* Actions list */}
      {planActions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-thingtrax-green uppercase tracking-widest text-sm font-semibold mb-6">
            <CheckCircle2 className="h-5 w-5" />
            Actions ({planActions.length})
          </div>
          <div className="space-y-2">
            {planActions.map(a => (
              <button
                key={a.id}
                onClick={() => onNavigate({ type: "action", actionId: a.id, objectiveId })}
                className="w-full group flex items-center gap-4 rounded-lg bg-white/5 border border-white/10 px-5 py-4 text-left hover:bg-white/8 hover:border-white/20 transition-all"
              >
                <span className={`w-3 h-3 rounded-full shrink-0 ${statusDot(a.status)}`} />
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-white group-hover:text-thingtrax-green transition-colors ${isExpanded ? "text-lg" : "text-base"}`}>
                    {a.task_title}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                    <span>{statusLabel(a.status)}</span>
                    {a.planned_end && <span>Due: {a.planned_end}</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20 group-hover:text-thingtrax-green shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   ACTION DETAIL VIEW
   ═══════════════════════════════════════════════════════════════════ */

function ActionDetailView({ action, nameOf, isExpanded }: {
  action: ActionData;
  nameOf: (uid?: string | null) => string;
  isExpanded: boolean;
}) {
  if (!action) return null;
  const isOverdue = action.planned_end && action.planned_end < new Date().toISOString().slice(0, 10) && action.status !== "Done";

  return (
    <div>
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full px-4 py-1 border border-white/20 text-white/50 uppercase tracking-widest text-xs">
            Action
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            action.status === "Done" || action.status === "done" ? "bg-green-500/20 text-green-400" :
            action.status === "In Progress" ? "bg-blue-500/20 text-blue-400" :
            action.status === "Blocked" ? "bg-red-500/20 text-red-400" :
            "bg-white/10 text-white/60"
          }`}>
            <span className={`w-2 h-2 rounded-full ${statusDot(action.status)}`} />
            {statusLabel(action.status)}
          </span>
          {isOverdue && (
            <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-red-500/20 text-red-400">
              <AlertTriangle className="h-3 w-3" /> Overdue
            </span>
          )}
        </div>
        <h1 className={`font-bold leading-tight text-white mb-6 ${isExpanded ? "text-5xl" : "text-4xl"}`}>
          {action.task_title}
        </h1>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {action.assignee && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Assignee</div>
            <div className="text-lg text-white">{nameOf(action.assignee)}</div>
          </div>
        )}
        {(action.planned_start || action.planned_end) && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-6">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Timeline</div>
            <div className="text-lg text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-white/40" />
              {action.planned_start ?? "?"} → {action.planned_end ?? "?"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   OBJECTIVE VIEW
   ═══════════════════════════════════════════════════════════════════ */

function ObjectiveView({ objective, questions, entries, nameOf, onSelectQuestion, isExpanded }: {
  objective: ObjectiveData;
  questions: QuestionData[];
  entries: EntryData[];
  nameOf: (uid?: string | null) => string;
  onSelectQuestion: (id: string) => void;
  isExpanded: boolean;
}) {
  const sorted = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return (
    <div>
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-full px-4 py-1 border border-white/20 text-white/50 uppercase tracking-widest text-xs">
            Objective
          </div>
          <RAGBadge value={objective.rag_status as any} />
        </div>
        <h1 className={`font-bold leading-tight text-white mb-4 ${isExpanded ? "text-5xl" : "text-4xl"}`}>
          {objective.title}
        </h1>
        {objective.description && (
          <div className="text-white/60 text-lg max-w-3xl">
            <RichTextView html={objective.description} className="text-white/60" />
          </div>
        )}
        {objective.target_outcome && (
          <div className="mt-4 rounded-lg bg-thingtrax-green/10 border border-thingtrax-green/20 px-6 py-4">
            <div className="text-xs text-thingtrax-green uppercase tracking-widest mb-1 font-semibold">Target Outcome</div>
            <div className="text-white/80">{objective.target_outcome}</div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 text-thingtrax-green uppercase tracking-widest text-sm font-semibold mb-6">
          <Lightbulb className="h-5 w-5" />
          Questions ({sorted.length})
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-lg bg-white/5 border border-white/10 p-8 text-center text-white/40">
            No questions defined for this objective yet.
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((q) => {
              const qEntries = entries.filter(e => e.question_id === q.id);
              const hasAnswers = qEntries.some(e => e.entry_type === "summary" || e.entry_type === "key_insight");
              const answerCount = qEntries.filter(e => e.entry_type === "summary").length;

              return (
                <button
                  key={q.id}
                  onClick={() => onSelectQuestion(q.id)}
                  className="w-full group rounded-xl bg-white/5 border border-white/10 px-6 py-5 text-left hover:border-thingtrax-green/40 hover:bg-thingtrax-green/5 transition-all flex items-start gap-4"
                >
                  <span className="flex items-center justify-center rounded-lg bg-white/10 text-white/60 font-bold w-10 h-10 text-base shrink-0 group-hover:bg-thingtrax-green/20 group-hover:text-thingtrax-green transition-colors">
                    {q.order_index}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`font-medium text-white group-hover:text-thingtrax-green transition-colors ${isExpanded ? "text-xl" : "text-lg"}`}>
                      {q.question_text}
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-sm text-white/40">
                      {hasAnswers ? (
                        <span className="inline-flex items-center gap-1 text-thingtrax-green">
                          <span className="w-2 h-2 rounded-full bg-thingtrax-green" />
                          {answerCount} answer{answerCount !== 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-white/30">Awaiting answer</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-white/20 group-hover:text-thingtrax-green transition-colors shrink-0 mt-2" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   QUESTION DETAIL VIEW
   ═══════════════════════════════════════════════════════════════════ */

function QuestionDetailView({ question, entries, nameOf, isExpanded }: {
  question: QuestionData;
  entries: EntryData[];
  nameOf: (uid?: string | null) => string;
  isExpanded: boolean;
}) {
  if (!question) return null;

  const byUser: Record<string, EntryData[]> = {};
  for (const e of entries) {
    const key = e.created_by ?? "__unknown__";
    if (!byUser[key]) byUser[key] = [];
    byUser[key].push(e);
  }

  const userKeys = Object.keys(byUser);
  const hasContent = entries.length > 0;

  return (
    <div>
      <div className="mb-10">
        <div className={`text-thingtrax-green font-semibold tracking-wide uppercase mb-3 ${isExpanded ? "text-xl" : "text-lg"}`}>
          Question {question.order_index}
        </div>
        <h1 className={`font-bold leading-tight text-white ${isExpanded ? "text-5xl" : "text-4xl"}`}>
          {question.question_text}
        </h1>
      </div>

      {!hasContent ? (
        <div className="rounded-lg bg-white/5 border border-white/10 p-10 text-center text-white/60 text-xl">
          No answers have been recorded for this question yet.
        </div>
      ) : (
        userKeys.map(uid => {
          const userEntries = byUser[uid];
          const summaries = userEntries.filter(e => e.entry_type === "summary");
          const insights = userEntries.filter(e => e.entry_type === "key_insight");
          const links = userEntries.filter(e => e.entry_type === "link");
          const displayName = nameOf(uid === "__unknown__" ? null : uid);

          return (
            <div key={uid} className="mb-12">
              <div className={`text-white/60 mb-6 ${isExpanded ? "text-2xl" : "text-xl"}`}>
                Answered by <span className="text-white font-medium">{displayName}</span>
              </div>

              {summaries.length > 0 && (
                <section className="mb-8">
                  <div className={`flex items-center gap-2 text-thingtrax-green uppercase tracking-wide mb-4 ${isExpanded ? "text-lg" : "text-base"}`}>
                    <Lightbulb className={isExpanded ? "h-6 w-6" : "h-5 w-5"} /> Answer
                  </div>
                  <div className="space-y-4">
                    {summaries.map(e => (
                      <div key={e.id} className={`rounded-lg bg-white/5 border border-white/10 ${isExpanded ? "p-10" : "p-8"}`}>
                        <RichTextView html={e.content} className="text-white text-2xl [&_p]:text-2xl [&_li]:text-2xl" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {insights.length > 0 && (
                <section className="mb-8">
                  <div className={`flex items-center gap-2 text-thingtrax-green uppercase tracking-wide mb-4 ${isExpanded ? "text-lg" : "text-base"}`}>
                    <Lightbulb className={isExpanded ? "h-6 w-6" : "h-5 w-5"} /> Key Insight
                  </div>
                  <div className="space-y-4">
                    {insights.map(e => (
                      <div key={e.id} className={`rounded-lg bg-white/5 border border-white/10 ${isExpanded ? "p-10" : "p-8"}`}>
                        <RichTextView html={e.content} className="text-white text-2xl [&_p]:text-2xl [&_li]:text-2xl" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {links.length > 0 && (
                <section className="mb-8">
                  <div className={`flex items-center gap-2 text-thingtrax-green uppercase tracking-wide mb-4 ${isExpanded ? "text-lg" : "text-base"}`}>
                    <Link2 className={isExpanded ? "h-6 w-6" : "h-5 w-5"} /> Supporting Evidence
                  </div>
                  <ul className="space-y-3">
                    {links.map(e => {
                      const raw = (e.content ?? "").trim();
                      const sep = raw.indexOf("|");
                      const name = sep === -1 ? "" : raw.slice(0, sep).trim();
                      const urlPart = sep === -1 ? raw : raw.slice(sep + 1).trim();
                      const isUrl = /^(https?:|mailto:|tel:)/i.test(urlPart);
                      const display = name || urlPart;
                      return (
                        <li key={e.id} className="rounded-lg bg-white/5 border border-white/10 px-6 py-4">
                          {isUrl ? (
                            <a href={urlPart} target="_blank" rel="noopener noreferrer" className="text-thingtrax-green underline break-all hover:opacity-80 text-xl">
                              {display}
                            </a>
                          ) : (
                            <RichTextView html={e.content} className="text-white text-xl" />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
