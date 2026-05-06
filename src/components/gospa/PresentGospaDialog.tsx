import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Home, ChevronLeft, Target, Lightbulb, Link2, Maximize2, Minimize2 } from "lucide-react";
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
  | { type: "question"; objectiveId: string; questionId: string };

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  goal: GoalData;
  objectives: ObjectiveData[];
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

/* ── Component ─────────────────────────────────────────────────── */

export function PresentGospaDialog({ open, onClose, goal, objectives }: Props) {
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

  const currentObjective = view.type !== "home" 
    ? objectives.find(o => o.id === view.objectiveId) 
    : null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex bg-thingtrax-black text-white"
    >
      {/* ── Left Navigation Panel ─────────────────────────────── */}
      <nav className="w-72 shrink-0 flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-sm">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <img src={thingtraxLogoFull} alt="Thingtrax" className="h-8" />
        </div>

        {/* Nav buttons */}
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

        {/* Objectives list */}
        <div className="px-4 pt-2 pb-1">
          <div className="text-xs text-white/40 uppercase tracking-widest font-semibold px-4 mb-2">
            Objectives
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {objectives.map((obj, i) => {
            const isActive = view.type !== "home" && view.objectiveId === obj.id;
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
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
          <div className="text-sm text-white/50">
            {view.type === "home" && "GOSPA Overview"}
            {view.type === "objective" && currentObjective?.title}
            {view.type === "question" && (() => {
              const q = questions.find(q => q.id === view.questionId);
              return q ? `Q${q.order_index}: ${q.question_text.slice(0, 60)}...` : "Question";
            })()}
          </div>
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

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className={`mx-auto py-10 transition-all ${isExpanded ? "max-w-none px-12" : "max-w-[1100px] px-10"}`}>
            {view.type === "home" && (
              <HomeView goal={goal} objectives={objectives} onSelectObjective={(id) => navigate({ type: "objective", objectiveId: id })} />
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
          </div>
        </main>
      </div>
    </div>
  );
}

/* ── Home View ─────────────────────────────────────────────────── */

function HomeView({ goal, objectives, onSelectObjective }: {
  goal: GoalData;
  objectives: ObjectiveData[];
  onSelectObjective: (id: string) => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
      {/* Logo accent */}
      <div className="mb-8">
        <img src={thingtraxLogoFull} alt="Thingtrax" className="h-12 opacity-80" />
      </div>

      {/* GOSPA label */}
      <div className="rounded-full px-5 py-1.5 mb-6 border border-thingtrax-green/30 text-thingtrax-green uppercase tracking-[0.2em] text-sm font-medium">
        GOSPA Strategic Plan
      </div>

      {/* Goal title */}
      <h1 className="text-5xl md:text-6xl font-bold leading-tight text-white mb-6 max-w-4xl">
        {goal.title}
      </h1>

      {/* Description */}
      {goal.description && (
        <p className="text-xl text-white/60 max-w-3xl mb-8 leading-relaxed">
          {goal.description}
        </p>
      )}

      {/* Dates */}
      {(goal.timeframe_start || goal.timeframe_end) && (
        <div className="flex items-center gap-3 text-white/40 text-lg mb-12">
          <span>{goal.timeframe_start ?? "—"}</span>
          <span className="text-thingtrax-green">→</span>
          <span>{goal.timeframe_end ?? "—"}</span>
        </div>
      )}

      {/* Objectives grid */}
      <div className="w-full max-w-4xl mt-4">
        <div className="text-xs text-white/40 uppercase tracking-widest mb-4">
          {objectives.length} Objective{objectives.length !== 1 ? "s" : ""}
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {objectives.map((obj, i) => (
            <button
              key={obj.id}
              onClick={() => onSelectObjective(obj.id)}
              className="group rounded-xl bg-white/5 border border-white/10 p-6 text-left hover:border-thingtrax-green/40 hover:bg-thingtrax-green/5 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center rounded-lg bg-thingtrax-green/20 text-thingtrax-green font-bold w-9 h-9 text-sm">
                  {i + 1}
                </span>
                {ragDot(obj.rag_status)}
              </div>
              <div className="font-semibold text-white group-hover:text-thingtrax-green transition-colors line-clamp-2 text-lg">
                {obj.title}
              </div>
              {obj.target_outcome && (
                <div className="text-sm text-white/40 mt-2 line-clamp-2">{obj.target_outcome}</div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Objective View ────────────────────────────────────────────── */

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
      {/* Objective header */}
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

      {/* Questions */}
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
                        <>
                          <span className="inline-flex items-center gap-1 text-thingtrax-green">
                            <span className="w-2 h-2 rounded-full bg-thingtrax-green" />
                            {answerCount} answer{answerCount !== 1 ? "s" : ""}
                          </span>
                        </>
                      ) : (
                        <span className="text-white/30">Awaiting answer</span>
                      )}
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-white/20 group-hover:text-thingtrax-green rotate-180 transition-colors shrink-0 mt-2" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Question Detail View (answers, insights, links) ──────────── */

function QuestionDetailView({ question, entries, nameOf, isExpanded }: {
  question: QuestionData;
  entries: EntryData[];
  nameOf: (uid?: string | null) => string;
  isExpanded: boolean;
}) {
  if (!question) return null;

  // Group by user
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
      {/* Question header */}
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
