import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, X, Link2, Lightbulb } from "lucide-react";
import { RichTextView } from "./RichTextView";
import thingtraxLogoFull from "@/assets/thingtrax-logo-full.png";

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

interface Slide {
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

interface Props {
  open: boolean;
  onClose: () => void;
  objectiveTitle: string;
  questions: Question[];
  entries: Entry[];
  nameOf: (uid?: string | null) => string;
}

function buildSlides(questions: Question[], entries: Entry[], nameOf: (uid?: string | null) => string): Slide[] {
  const slides: Slide[] = [];
  const sorted = [...questions].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  for (const q of sorted) {
    const qEntries = entries.filter(
      (e) => e.question_id === q.id && (e.entry_type === "summary" || e.entry_type === "link" || e.entry_type === "key_insight"),
    );
    if (!qEntries.length) {
      slides.push({
        questionId: q.id,
        questionNumber: q.order_index,
        questionText: q.question_text,
        ownerId: null,
        ownerName: "",
        summaries: [],
        insights: [],
        links: [],
        empty: true,
      });
      continue;
    }
    // Group by created_by
    const byUser = new Map<string, Entry[]>();
    for (const e of qEntries) {
      const key = e.created_by ?? "__unknown__";
      if (!byUser.has(key)) byUser.set(key, []);
      byUser.get(key)!.push(e);
    }
    for (const [uid, list] of byUser) {
      slides.push({
        questionId: q.id,
        questionNumber: q.order_index,
        questionText: q.question_text,
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

export function PresentObjectiveDialog({ open, onClose, objectiveTitle, questions, entries, nameOf }: Props) {
  const slides = useMemo(() => buildSlides(questions, entries, nameOf), [questions, entries, nameOf]);
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [cursorHidden, setCursorHidden] = useState(false);
  const cursorTimer = useRef<number | null>(null);

  const next = useCallback(() => setIndex((i) => Math.min(i + 1, Math.max(0, slides.length - 1))), [slides.length]);
  const prev = useCallback(() => setIndex((i) => Math.max(i - 1, 0)), []);

  // Open / close lifecycle
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    const el = containerRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
    const onFsChange = () => {
      if (!document.fullscreenElement) onClose();
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
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/10 shrink-0">
        <img src={thingtraxLogoFull} alt="Thingtrax" className="h-8" />
        <div className="text-sm text-white/70 truncate px-4 max-w-[50%] text-center">{objectiveTitle}</div>
        <div className="flex items-center gap-4">
          <span className="text-sm tabular-nums text-white/70">
            {slides.length ? index + 1 : 0} / {slides.length}
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-2 hover:bg-white/10 transition-colors"
            aria-label="Exit present mode"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-auto">
        <div ref={contentRef} className="max-w-[1100px] mx-auto px-10 py-12 gospa-present-content">
          {!slide ? (
            <div className="text-center text-white/60 mt-24 text-2xl">No questions to present yet.</div>
          ) : (
            <>
              <div className="mb-8">
                <div className="text-thingtrax-green text-base font-semibold tracking-wide uppercase mb-2">
                  Question {slide.questionNumber}
                </div>
                <h1 className="text-4xl font-bold leading-tight text-white">{slide.questionText}</h1>
                <div className="mt-4 text-white/60 text-lg">
                  {slide.empty ? "Awaiting an answer" : <>Answered by <span className="text-white">{slide.ownerName || "—"}</span></>}
                </div>
              </div>

              {!slide.empty && slide.summaries.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 text-thingtrax-green text-sm uppercase tracking-wide mb-3">
                    <Lightbulb className="h-4 w-4" /> Key insights
                  </div>
                  <div className="space-y-4">
                    {slide.summaries.map((e) => (
                      <div key={e.id} className="rounded-lg bg-white/5 border border-white/10 p-6">
                        <RichTextView html={e.content} className="text-white" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {!slide.empty && slide.links.length > 0 && (
                <section className="mb-8">
                  <div className="flex items-center gap-2 text-thingtrax-green text-sm uppercase tracking-wide mb-3">
                    <Link2 className="h-4 w-4" /> Supporting evidence
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
                            <a
                              href={urlPart}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-thingtrax-green underline break-all hover:opacity-80"
                            >
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
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between px-8 py-4 border-t border-white/10 shrink-0">
        <button
          onClick={prev}
          disabled={index === 0}
          className="inline-flex items-center gap-2 rounded-md px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-white/10 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>

        <div className="flex items-center gap-2 overflow-x-auto max-w-[60%]">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 w-2 rounded-full shrink-0 transition-all ${
                i === index ? "bg-thingtrax-green w-6" : "bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
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
