import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Link2, Lightbulb, Maximize2, Minimize2, Target, Compass, Map, ListChecks, BarChart3, AlertTriangle, Gavel } from "lucide-react";
import { RichTextView } from "./RichTextView";
import { RAGBadge } from "./RAGBadge";
import { StatusPill } from "./StatusPill";
import thingtraxLogoFull from "@/assets/thingtrax-logo-full.png";

/* ── Types ─────────────────────────────────────────────────────── */

interface Entry {
  id: string;
  question_id: string;
  entry_type: "summary" | "risk" | "opportunity" | "link" | "key_insight";
  content: string;
  created_by?: string | null;
}

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  created_by?: string | null;
}

interface Strategy {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  rag_status: string;
}

interface Plan {
  id: string;
  title: string;
  strategy_id: string;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
}

interface Action {
  id: string;
  task_title: string;
  status: string;
  planned_end?: string | null;
  assignee?: string | null;
}

interface Metric {
  id: string;
  name: string;
  target_value?: number | null;
  current_value?: number | null;
  unit?: string | null;
  trend?: string | null;
}

interface Blocker {
  id: string;
  description: string;
  severity: string;
  status?: string | null;
}

interface Decision {
  id: string;
  description: string;
  decision_date?: string | null;
}

interface ObjectiveData {
  title: string;
  description?: string | null;
  rag_status?: string | null;
  strategic_direction?: string | null;
}

/* ── Section types ─────────────────────────────────────────────── */

type SectionType = "title" | "questions" | "direction" | "strategies" | "plans" | "actions" | "metrics" | "risks";

interface SectionDef {
  type: SectionType;
  label: string;
  icon: React.ReactNode;
  slideCount: number;
}

/* ── Question slides (same logic as before) ────────────────────── */

interface QuestionSlide {
  questionId: string;
  questionNumber: number;
  questionText: string;
  ownerId: string | null;
  ownerName: string;
  summaries: Entry[];
  insights: Entry[];
  links: Entry[];
  empty?: boolean;
}

function buildQuestionSlides(questions: Question[], entries: Entry[], nameOf: (uid?: string | null) => string): QuestionSlide[] {
  const slides: QuestionSlide[] = [];
  const sorted = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  for (const q of sorted) {
    const qEntries = entries.filter(
      (e) => e.question_id === q.id && (e.entry_type === "summary" || e.entry_type === "link" || e.entry_type === "key_insight"),
    );
    if (!qEntries.length) {
      slides.push({ questionId: q.id, questionNumber: q.order_index, questionText: q.question_text, ownerId: null, ownerName: "", summaries: [], insights: [], links: [], empty: true });
      continue;
    }
    const byUser: Record<string, Entry[]> = {};
    for (const e of qEntries) {
      const key = e.created_by ?? "__unknown__";
      if (!byUser[key]) byUser[key] = [];
      byUser[key].push(e);
    }
    for (const uid of Object.keys(byUser)) {
      const list = byUser[uid];
      slides.push({
        questionId: q.id, questionNumber: q.order_index, questionText: q.question_text,
        ownerId: uid === "__unknown__" ? null : uid,
        ownerName: nameOf(uid === "__unknown__" ? null : uid),
        summaries: list.filter((e) => e.entry_type === "summary"),
        insights: list.filter((e) => e.entry_type === "key_insight"),
        links: list.filter((e) => e.entry_type === "link"),
      });
    }
  }
  return slides;
}

/* ── Universal slide model ─────────────────────────────────────── */

interface Slide {
  section: SectionType;
  sectionLabel: string;
  render: (isExpanded: boolean) => React.ReactNode;
}

/* ── Props ─────────────────────────────────────────────────────── */

interface Props {
  open: boolean;
  onClose: () => void;
  objective: ObjectiveData;
  initialQuestionId?: string | null;
  questions: Question[];
  entries: Entry[];
  strategies: Strategy[];
  plans: Plan[];
  actions: Action[];
  metrics: Metric[];
  blockers: Blocker[];
  decisions: Decision[];
  nameOf: (uid?: string | null) => string;
}

/* ── Helpers ───────────────────────────────────────────────────── */

const ragColor = (rag?: string | null) => {
  if (rag === "green") return "text-green-400";
  if (rag === "amber") return "text-amber-400";
  if (rag === "red") return "text-red-400";
  return "text-white/50";
};

const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

const trendIcon = (t?: string | null) => {
  if (t === "up") return "↑";
  if (t === "down") return "↓";
  return "→";
};

const trendColor = (t?: string | null) => {
  if (t === "up") return "text-green-400";
  if (t === "down") return "text-red-400";
  return "text-white/50";
};

const severityColor = (s: string) => {
  if (s === "critical") return "bg-red-500/20 text-red-400 border-red-500/30";
  if (s === "high") return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  if (s === "medium") return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
  return "bg-white/5 text-white/60 border-white/10";
};

/* ── Component ─────────────────────────────────────────────────── */

export function PresentObjectiveDialog({
  open, onClose, objective, questions, entries, strategies, plans, actions, metrics, blockers, decisions, nameOf, initialQuestionId,
}: Props) {

  const questionSlides = useMemo(() => buildQuestionSlides(questions, entries, nameOf), [questions, entries, nameOf]);

  // Build all slides
  const { slides, sections } = useMemo(() => {
    const allSlides: Slide[] = [];
    const allSections: SectionDef[] = [];

    // 1. Title slide
    allSlides.push({
      section: "title",
      sectionLabel: "Overview",
      render: (isExpanded) => (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className={`rounded-full px-5 py-1.5 mb-6 border border-white/20 text-white/60 uppercase tracking-widest ${isExpanded ? "text-base" : "text-sm"}`}>
            Objective
          </div>
          <h1 className={`font-bold leading-tight text-white mb-6 ${isExpanded ? "text-6xl" : "text-5xl"}`}>
            {objective.title}
          </h1>
          {objective.description && (
            <div className={`max-w-3xl mx-auto text-white/70 ${isExpanded ? "text-2xl" : "text-xl"}`}>
              <RichTextView html={objective.description} className="text-white/70" />
            </div>
          )}
          {objective.rag_status && (
            <div className={`mt-8 inline-flex items-center gap-2 rounded-full px-4 py-2 border border-white/10 bg-white/5 ${ragColor(objective.rag_status)}`}>
              <span className="inline-block w-3 h-3 rounded-full bg-current" />
              <span className="uppercase tracking-wide text-sm font-medium">{objective.rag_status} status</span>
            </div>
          )}
        </div>
      ),
    });
    allSections.push({ type: "title", label: "Overview", icon: <Target className="h-4 w-4" />, slideCount: 1 });

    // 2. Question slides
    if (questionSlides.length > 0) {
      for (const qs of questionSlides) {
        allSlides.push({
          section: "questions",
          sectionLabel: "Questions & Answers",
          render: (isExpanded) => <QuestionSlideContent slide={qs} isExpanded={isExpanded} />,
        });
      }
      allSections.push({ type: "questions", label: "Q&A", icon: <Lightbulb className="h-4 w-4" />, slideCount: questionSlides.length });
    }

    // 3. Strategic Direction
    if (objective.strategic_direction) {
      allSlides.push({
        section: "direction",
        sectionLabel: "Strategic Direction",
        render: (isExpanded) => (
          <div>
            <SectionHeader icon={<Compass className={isExpanded ? "h-7 w-7" : "h-6 w-6"} />} title="Strategic Direction" isExpanded={isExpanded} />
            <div className={`rounded-xl bg-white/5 border border-white/10 ${isExpanded ? "p-10" : "p-8"}`}>
              <RichTextView html={objective.strategic_direction!} className="text-white" />
            </div>
          </div>
        ),
      });
      allSections.push({ type: "direction", label: "Direction", icon: <Compass className="h-4 w-4" />, slideCount: 1 });
    }

    // 4. Strategies
    if (strategies.length > 0) {
      allSlides.push({
        section: "strategies",
        sectionLabel: "Strategies",
        render: (isExpanded) => (
          <div>
            <SectionHeader icon={<Map className={isExpanded ? "h-7 w-7" : "h-6 w-6"} />} title="Strategies" subtitle={`${strategies.length} strateg${strategies.length === 1 ? "y" : "ies"} defined`} isExpanded={isExpanded} />
            <div className="space-y-4">
              {strategies.map((s, i) => (
                <div key={s.id} className={`rounded-xl bg-white/5 border border-white/10 ${isExpanded ? "p-8" : "p-6"}`}>
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3">
                      <span className={`flex items-center justify-center rounded-lg bg-thingtrax-green/20 text-thingtrax-green font-bold ${isExpanded ? "w-10 h-10 text-lg" : "w-8 h-8 text-base"}`}>{i + 1}</span>
                      <h3 className={`font-semibold text-white ${isExpanded ? "text-2xl" : "text-xl"}`}>{s.title}</h3>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium border ${ragColor(s.rag_status)} border-current/30`}>{s.rag_status?.toUpperCase()}</span>
                      <span className="rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-white/70">{statusLabel(s.status)}</span>
                    </div>
                  </div>
                  {s.description && <RichTextView html={s.description} className="text-white/70" />}
                </div>
              ))}
            </div>
          </div>
        ),
      });
      allSections.push({ type: "strategies", label: "Strategies", icon: <Map className="h-4 w-4" />, slideCount: 1 });
    }

    // 5. Plans (grouped by strategy)
    if (plans.length > 0) {
      allSlides.push({
        section: "plans",
        sectionLabel: "Plans",
        render: (isExpanded) => (
          <div>
            <SectionHeader icon={<ListChecks className={isExpanded ? "h-7 w-7" : "h-6 w-6"} />} title="Plans" subtitle={`${plans.length} plan${plans.length === 1 ? "" : "s"} across strategies`} isExpanded={isExpanded} />
            <div className="space-y-6">
              {strategies.filter(s => plans.some(p => p.strategy_id === s.id)).map(s => (
                <div key={s.id}>
                  <h3 className={`text-thingtrax-green font-semibold uppercase tracking-wide mb-3 ${isExpanded ? "text-lg" : "text-base"}`}>{s.title}</h3>
                  <div className="space-y-2">
                    {plans.filter(p => p.strategy_id === s.id).map(p => (
                      <div key={p.id} className={`rounded-lg bg-white/5 border border-white/10 flex items-center gap-4 ${isExpanded ? "px-6 py-4" : "px-5 py-3"}`}>
                        <span className={`flex-1 text-white font-medium ${isExpanded ? "text-xl" : "text-lg"}`}>{p.title}</span>
                        {(p.start_date || p.end_date) && (
                          <span className="text-white/50 text-sm shrink-0">
                            {p.start_date ?? "?"} → {p.end_date ?? "?"}
                          </span>
                        )}
                        <span className="rounded-full px-3 py-1 text-xs font-medium bg-white/10 text-white/70 shrink-0">{statusLabel(p.status)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ),
      });
      allSections.push({ type: "plans", label: "Plans", icon: <ListChecks className="h-4 w-4" />, slideCount: 1 });
    }

    // 6. Actions
    if (actions.length > 0) {
      allSlides.push({
        section: "actions",
        sectionLabel: "Actions",
        render: (isExpanded) => {
          const byStatus: Record<string, typeof actions> = {};
          for (const a of actions) {
            const s = a.status || "Planned";
            if (!byStatus[s]) byStatus[s] = [];
            byStatus[s].push(a);
          }
          const statusOrder = ["In Progress", "Planned", "Blocked", "Done"];
          const statusColor: Record<string, string> = {
            "In Progress": "bg-blue-500/20 text-blue-400",
            Planned: "bg-white/10 text-white/60",
            Blocked: "bg-red-500/20 text-red-400",
            Done: "bg-green-500/20 text-green-400",
          };
          return (
            <div>
              <SectionHeader icon={<ListChecks className={isExpanded ? "h-7 w-7" : "h-6 w-6"} />} title="Actions" subtitle={`${actions.length} action${actions.length === 1 ? "" : "s"}`} isExpanded={isExpanded} />
              <div className="grid grid-cols-2 gap-4">
                {statusOrder.filter(s => byStatus[s]?.length).map(status => (
                  <div key={status} className="rounded-xl bg-white/5 border border-white/10 p-5">
                    <div className={`flex items-center gap-2 mb-3 ${statusColor[status] || ""}`}>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${statusColor[status]}`}>{status}</span>
                      <span className="text-white/40 text-sm">({byStatus[status].length})</span>
                    </div>
                    <div className="space-y-2">
                      {byStatus[status].map(a => (
                        <div key={a.id} className="flex items-center gap-3 rounded-lg bg-white/5 px-4 py-2.5">
                          <span className={`text-white ${isExpanded ? "text-lg" : "text-base"}`}>{a.task_title}</span>
                          {a.planned_end && <span className="text-white/40 text-xs shrink-0 ml-auto">{a.planned_end}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        },
      });
      allSections.push({ type: "actions", label: "Actions", icon: <ListChecks className="h-4 w-4" />, slideCount: 1 });
    }

    // 7. Metrics
    if (metrics.length > 0) {
      allSlides.push({
        section: "metrics",
        sectionLabel: "Metrics",
        render: (isExpanded) => (
          <div>
            <SectionHeader icon={<BarChart3 className={isExpanded ? "h-7 w-7" : "h-6 w-6"} />} title="Metrics" subtitle={`${metrics.length} metric${metrics.length === 1 ? "" : "s"} tracked`} isExpanded={isExpanded} />
            <div className={`grid ${metrics.length <= 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4"} gap-4`}>
              {metrics.map(m => {
                const pct = m.target_value && m.current_value ? Math.round((m.current_value / m.target_value) * 100) : null;
                return (
                  <div key={m.id} className="rounded-xl bg-white/5 border border-white/10 p-6 text-center">
                    <div className={`text-white/60 uppercase tracking-wide mb-3 ${isExpanded ? "text-base" : "text-sm"}`}>{m.name}</div>
                    <div className={`font-bold text-white ${isExpanded ? "text-5xl" : "text-4xl"}`}>
                      {m.current_value ?? "—"}
                      {m.unit && <span className="text-lg text-white/50 ml-1">{m.unit}</span>}
                    </div>
                    {m.target_value != null && (
                      <div className="mt-3">
                        <div className="text-white/40 text-sm mb-1">Target: {m.target_value}{m.unit ? ` ${m.unit}` : ""}</div>
                        <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-thingtrax-green h-full rounded-full transition-all"
                            style={{ width: `${Math.min(pct ?? 0, 100)}%` }}
                          />
                        </div>
                        {pct != null && <div className="text-thingtrax-green text-sm mt-1 font-medium">{pct}%</div>}
                      </div>
                    )}
                    {m.trend && (
                      <div className={`mt-2 text-lg font-semibold ${trendColor(m.trend)}`}>
                        {trendIcon(m.trend)} {m.trend}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ),
      });
      allSections.push({ type: "metrics", label: "Metrics", icon: <BarChart3 className="h-4 w-4" />, slideCount: 1 });
    }

    // 8. Blockers & Decisions
    if (blockers.length > 0 || decisions.length > 0) {
      allSlides.push({
        section: "risks",
        sectionLabel: "Risks & Decisions",
        render: (isExpanded) => (
          <div>
            <SectionHeader icon={<AlertTriangle className={isExpanded ? "h-7 w-7" : "h-6 w-6"} />} title="Risks & Decisions" isExpanded={isExpanded} />
            <div className="grid md:grid-cols-2 gap-6">
              {blockers.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 text-red-400 uppercase tracking-wide mb-3 ${isExpanded ? "text-base" : "text-sm"}`}>
                    <AlertTriangle className="h-4 w-4" /> Blockers ({blockers.length})
                  </div>
                  <div className="space-y-2">
                    {blockers.map(b => (
                      <div key={b.id} className={`rounded-lg border px-5 py-3 ${severityColor(b.severity)}`}>
                        <div className="flex items-center justify-between gap-3">
                          <span className={isExpanded ? "text-lg" : "text-base"}>{b.description}</span>
                          <span className="text-xs uppercase font-bold shrink-0">{b.severity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {decisions.length > 0 && (
                <div>
                  <div className={`flex items-center gap-2 text-thingtrax-green uppercase tracking-wide mb-3 ${isExpanded ? "text-base" : "text-sm"}`}>
                    <Gavel className="h-4 w-4" /> Decisions ({decisions.length})
                  </div>
                  <div className="space-y-2">
                    {decisions.map(d => (
                      <div key={d.id} className="rounded-lg bg-white/5 border border-white/10 px-5 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-white ${isExpanded ? "text-lg" : "text-base"}`}>{d.description}</span>
                          {d.decision_date && <span className="text-white/40 text-xs shrink-0">{d.decision_date}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ),
      });
      allSections.push({ type: "risks", label: "Risks", icon: <AlertTriangle className="h-4 w-4" />, slideCount: 1 });
    }

    return { slides: allSlides, sections: allSections };
  }, [objective, questionSlides, strategies, plans, actions, metrics, blockers, decisions]);

  const [index, setIndex] = useState(0);
  const [activeSection, setActiveSection] = useState<SectionType>("title");
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const cursorTimer = useRef<number | null>(null);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, Math.max(0, slides.length - 1))), [slides.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Track active section
  useEffect(() => {
    if (slides[index]) setActiveSection(slides[index].section);
  }, [index, slides]);

  // Navigate to section
  const goToSection = useCallback((type: SectionType) => {
    const idx = slides.findIndex(s => s.section === type);
    if (idx >= 0) setIndex(idx);
  }, [slides]);

  // Open / close lifecycle
  useEffect(() => {
    if (!open) return;
    if (initialQuestionId) {
      const slideIdx = slides.findIndex(s => s.section === "questions");
      const qIdx = slides.findIndex(s => s.section === "questions" && s.render.toString().includes(initialQuestionId));
      setIndex(qIdx >= 0 ? qIdx : (slideIdx >= 0 ? slideIdx : 0));
    } else {
      setIndex(0);
    }
    // Try fullscreen but don't depend on it
    const el = containerRef.current;
    let enteredFullscreen = false;
    if (el && el.requestFullscreen) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
      else if (e.key === "Home") { e.preventDefault(); setIndex(0); }
      else if (e.key === "End") { e.preventDefault(); setIndex(Math.max(0, slides.length - 1)); }
      else if (e.key === "Escape") { onClose(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, slides.length, onClose]);

  // Force external links to open in new tab
  useEffect(() => {
    if (!open) return;
    const root = contentRef.current;
    if (!root) return;
    root.querySelectorAll("a[href]").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    });
  }, [open, index, slides]);

  // Cursor auto-hide
  useEffect(() => {
    if (!open) return;
    const reset = () => {
      setCursorHidden(false);
      if (cursorTimer.current) window.clearTimeout(cursorTimer.current);
      cursorTimer.current = window.setTimeout(() => setCursorHidden(true), 3000);
    };
    reset();
    window.addEventListener("mousemove", reset);
    return () => {
      window.removeEventListener("mousemove", reset);
      if (cursorTimer.current) window.clearTimeout(cursorTimer.current);
    };
  }, [open]);

  if (!open) return null;
  const slide = slides[index];

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[100] flex flex-col bg-thingtrax-black text-white"
      style={{ cursor: cursorHidden ? "none" : "auto" }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-white/10 shrink-0">
        <img src={thingtraxLogoFull} alt="Thingtrax" className="h-7" />

        {/* Section nav pills */}
        <nav className="flex items-center gap-1 overflow-x-auto max-w-[60%]">
          {sections.map(sec => (
            <button
              key={sec.type}
              onClick={() => goToSection(sec.type)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
                activeSection === sec.type
                  ? "bg-thingtrax-green/20 text-thingtrax-green border border-thingtrax-green/30"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`}
            >
              {sec.icon}
              {sec.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="text-sm tabular-nums text-white/70">
            {slides.length ? index + 1 : 0} / {slides.length}
          </span>
          <button
            onClick={() => setIsExpanded(e => !e)}
            className="rounded-md p-2 hover:bg-white/10 transition-colors"
            aria-label={isExpanded ? "Collapse content" : "Expand content to full width"}
          >
            {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button onClick={onClose} className="rounded-md p-2 hover:bg-white/10 transition-colors" aria-label="Exit present mode">
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Section label bar */}
      {slide && (
        <div className="px-8 py-2 border-b border-white/5 bg-white/[0.02]">
          <span className="text-xs text-white/40 uppercase tracking-widest">{slide.sectionLabel}</span>
        </div>
      )}

      {/* Body */}
      <main className="flex-1 overflow-auto">
        <div ref={contentRef} className={`mx-auto py-10 gospa-present-content transition-all ${isExpanded ? "gospa-present-expanded max-w-none px-12" : "max-w-[1100px] px-10"}`}>
          {!slide ? (
            <div className="text-center text-white/60 mt-24 text-2xl">No content to present yet.</div>
          ) : (
            slide.render(isExpanded)
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-8 py-3 border-t border-white/10 shrink-0">
        <button
          onClick={prev}
          disabled={index === 0}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>

        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%]">
          {slides.map((s, i) => {
            // Different dot color per section
            const isSectionStart = i === 0 || slides[i - 1].section !== s.section;
            return (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`shrink-0 rounded-full transition-all ${
                  i === index
                    ? "bg-thingtrax-green h-2.5 w-6"
                    : isSectionStart
                      ? "bg-white/50 h-2.5 w-2.5"
                      : "bg-white/20 h-2 w-2 hover:bg-white/40"
                }`}
              />
            );
          })}
        </div>

        <button
          onClick={next}
          disabled={index >= slides.length - 1}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors"
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </footer>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────── */

function SectionHeader({ icon, title, subtitle, isExpanded }: { icon: React.ReactNode; title: string; subtitle?: string; isExpanded: boolean }) {
  return (
    <div className="mb-8">
      <div className={`flex items-center gap-3 text-thingtrax-green mb-2`}>
        {icon}
        <span className={`uppercase tracking-widest font-semibold ${isExpanded ? "text-base" : "text-sm"}`}>{title}</span>
      </div>
      <h2 className={`font-bold text-white ${isExpanded ? "text-4xl" : "text-3xl"}`}>{title}</h2>
      {subtitle && <p className={`mt-1 text-white/50 ${isExpanded ? "text-xl" : "text-lg"}`}>{subtitle}</p>}
    </div>
  );
}

function QuestionSlideContent({ slide, isExpanded }: { slide: QuestionSlide; isExpanded: boolean }) {
  return (
    <>
      <div className="mb-10">
        <div className={`text-thingtrax-green font-semibold tracking-wide uppercase mb-3 ${isExpanded ? "text-xl" : "text-lg"}`}>
          Question {slide.questionNumber}
        </div>
        <h1 className={`font-bold leading-tight text-white ${isExpanded ? "text-6xl" : "text-5xl"}`}>{slide.questionText}</h1>
        <div className={`mt-5 text-white/60 ${isExpanded ? "text-2xl" : "text-xl"}`}>
          {slide.empty ? "Awaiting an answer" : <>Answered by <span className="text-white">{slide.ownerName || "—"}</span></>}
        </div>
      </div>

      {!slide.empty && slide.summaries.length > 0 && (
        <section className="mb-10">
          <div className={`flex items-center gap-2 text-thingtrax-green uppercase tracking-wide mb-4 ${isExpanded ? "text-lg" : "text-base"}`}>
            <Lightbulb className={isExpanded ? "h-6 w-6" : "h-5 w-5"} /> Answer
          </div>
          <div className="space-y-5">
            {slide.summaries.map((e) => (
              <div key={e.id} className={`rounded-lg bg-white/5 border border-white/10 ${isExpanded ? "p-10" : "p-8"}`}>
                <RichTextView html={e.content} className="text-white text-2xl [&_p]:text-2xl [&_li]:text-2xl" />
              </div>
            ))}
          </div>
        </section>
      )}

      {!slide.empty && slide.insights.length > 0 && (
        <section className="mb-10">
          <div className={`flex items-center gap-2 text-thingtrax-green uppercase tracking-wide mb-4 ${isExpanded ? "text-lg" : "text-base"}`}>
            <Lightbulb className={isExpanded ? "h-6 w-6" : "h-5 w-5"} /> Key insight
          </div>
          <div className="space-y-5">
            {slide.insights.map((e) => (
              <div key={e.id} className={`rounded-lg bg-white/5 border border-white/10 ${isExpanded ? "p-10" : "p-8"}`}>
                <RichTextView html={e.content} className="text-white text-2xl [&_p]:text-2xl [&_li]:text-2xl" />
              </div>
            ))}
          </div>
        </section>
      )}

      {!slide.empty && slide.links.length > 0 && (
        <section className="mb-8">
          <div className={`flex items-center gap-2 text-thingtrax-green uppercase tracking-wide mb-3 ${isExpanded ? "text-base" : "text-sm"}`}>
            <Link2 className={isExpanded ? "h-5 w-5" : "h-4 w-4"} /> Supporting evidence
          </div>
          <ul className="space-y-2">
            {slide.links.map((e) => {
              const raw = (e.content ?? "").trim();
              const sep = raw.indexOf("|");
              const name = sep === -1 ? "" : raw.slice(0, sep).trim();
              const urlPart = sep === -1 ? raw : raw.slice(sep + 1).trim();
              const isUrl = /^(https?:|mailto:|tel:)/i.test(urlPart);
              const display = name || urlPart;
              return (
                <li key={e.id} className="rounded-lg bg-white/5 border border-white/10 px-5 py-3">
                  {isUrl ? (
                    <a href={urlPart} target="_blank" rel="noopener noreferrer" className="text-thingtrax-green underline break-all hover:opacity-80">
                      {display}
                    </a>
                  ) : (
                    <RichTextView html={e.content} className="text-white" />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {slide.empty && (
        <div className="rounded-lg bg-white/5 border border-white/10 p-10 text-center text-white/60 text-xl">
          No answers have been recorded for this question yet.
        </div>
      )}
    </>
  );
}
