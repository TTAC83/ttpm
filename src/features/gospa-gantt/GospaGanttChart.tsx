import { useMemo, useRef, useState, useEffect } from "react";
import { useGospaGanttData } from "./useGospaGanttData";
import { flattenVisible, computeBounds, generateDateMarkers, generateMonthBands, dateToX } from "./buildTimeline";
import type { GospaGanttRow } from "./types";
import { STATUS_COLOURS, KIND_LABEL, KIND_BADGE_BG } from "./visuals";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronRight, ChevronDown, ZoomIn, ZoomOut, Calendar, Download, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateUK } from "@/lib/dateUtils";

const ROW_HEIGHT = 32;
const HEADER_HEIGHT = 56;
const SIDEBAR_WIDTH = 320;
const ZOOMS = [0.5, 0.75, 1, 1.5, 2, 3];
const BASE_DAY_WIDTH = 16;

export function GospaGanttChart() {
  const { data, isLoading, error } = useGospaGanttData();
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [drawerKey, setDrawerKey] = useState<string | null>(null);
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const sidebarScrollRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Default expansion: all goals + objectives expanded
  useEffect(() => {
    if (!data) return;
    const next = new Set<string>();
    data.rows.forEach(r => {
      if (r.kind === "goal" || r.kind === "objective") next.add(r.key);
    });
    setExpanded(next);
  }, [data]);

  const visibleRows = useMemo(() => (data ? flattenVisible(data, expanded) : []), [data, expanded]);
  const bounds = useMemo(
    () => (data ? computeBounds(Array.from(data.rows.values())) : { start: new Date(), end: new Date() }),
    [data]
  );
  const dayWidth = BASE_DAY_WIDTH * zoom;
  const dateMarkers = useMemo(() => generateDateMarkers(bounds.start, bounds.end, dayWidth, zoom), [bounds, dayWidth, zoom]);
  const monthBands = useMemo(() => generateMonthBands(bounds.start, bounds.end, dayWidth), [bounds, dayWidth]);
  const totalWidth = monthBands.length ? monthBands[monthBands.length - 1].position + monthBands[monthBands.length - 1].width : 1000;
  const totalHeight = visibleRows.length * ROW_HEIGHT;

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayX = dateToX(today, bounds.start, dayWidth);

  // Scroll sync
  useEffect(() => {
    const h = headerScrollRef.current, t = timelineScrollRef.current;
    if (!h || !t) return;
    const sync = (from: HTMLDivElement, to: HTMLDivElement) => () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      to.scrollLeft = from.scrollLeft;
      requestAnimationFrame(() => { isSyncing.current = false; });
    };
    const a = sync(t, h), b = sync(h, t);
    t.addEventListener("scroll", a); h.addEventListener("scroll", b);
    return () => { t.removeEventListener("scroll", a); h.removeEventListener("scroll", b); };
  }, []);

  useEffect(() => {
    const s = sidebarScrollRef.current, t = timelineScrollRef.current;
    if (!s || !t) return;
    const sync = (from: HTMLDivElement, to: HTMLDivElement) => () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      to.scrollTop = from.scrollTop;
      requestAnimationFrame(() => { isSyncing.current = false; });
    };
    const a = sync(t, s), b = sync(s, t);
    t.addEventListener("scroll", a); s.addEventListener("scroll", b);
    return () => { t.removeEventListener("scroll", a); s.removeEventListener("scroll", b); };
  }, []);

  const toggleExpand = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    if (!data) return;
    const next = new Set<string>();
    data.rows.forEach((r, k) => { if (r.childKeys.length) next.add(k); });
    setExpanded(next);
  };
  const collapseAll = () => setExpanded(new Set());

  const scrollToToday = () => {
    if (!timelineScrollRef.current) return;
    const x = todayX - timelineScrollRef.current.clientWidth / 2;
    timelineScrollRef.current.scrollTo({ left: Math.max(0, x), behavior: "smooth" });
  };

  const exportCSV = () => {
    if (!data) return;
    const rows = Array.from(data.rows.values());
    const lines = [["Kind", "Title", "Status", "Start", "End"].join(",")];
    rows.forEach(r => {
      lines.push([
        KIND_LABEL[r.kind],
        `"${(r.title ?? "").replace(/"/g, '""')}"`,
        r.status,
        r.start ? r.start.toISOString().split("T")[0] : "",
        r.end ? r.end.toISOString().split("T")[0] : "",
      ].join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gospa-timeline-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setZoomLevel = (delta: number) => {
    const idx = ZOOMS.indexOf(zoom);
    const next = Math.max(0, Math.min(ZOOMS.length - 1, idx + delta));
    setZoom(ZOOMS[next]);
  };

  if (isLoading) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-8 w-64" />
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
      </Card>
    );
  }

  if (error || !data) {
    return <Card className="p-4 text-sm text-destructive">Failed to load GOSPA timeline.</Card>;
  }

  if (!data.rows.size) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No goals yet. Create goals, objectives, strategies, plans and actions to populate the Gantt view.
      </Card>
    );
  }

  const drawerRow = drawerKey ? data.rows.get(drawerKey) : null;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={expandAll}>Expand all</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse all</Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => setZoomLevel(-1)} aria-label="Zoom out"><ZoomOut className="h-4 w-4"/></Button>
          <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="outline" size="icon" onClick={() => setZoomLevel(1)} aria-label="Zoom in"><ZoomIn className="h-4 w-4"/></Button>
          <Button variant="outline" size="sm" onClick={scrollToToday}><Calendar className="h-4 w-4 mr-1"/>Today</Button>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="h-4 w-4 mr-1"/>CSV</Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        {/* Header */}
        <div className="flex border-b bg-muted/40" style={{ height: HEADER_HEIGHT }}>
          <div className="flex-shrink-0 flex items-center px-3 border-r font-semibold text-sm" style={{ width: SIDEBAR_WIDTH }}>
            GOSPA Hierarchy
          </div>
          <div ref={headerScrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
            <svg width={totalWidth} height={HEADER_HEIGHT}>
              {monthBands.map((m, i) => (
                <g key={`m-${i}`}>
                  <rect x={m.position} y={0} width={m.width} height={HEADER_HEIGHT / 2} fill="hsl(var(--muted))" opacity={0.5}/>
                  <line x1={m.position} y1={0} x2={m.position} y2={HEADER_HEIGHT} stroke="hsl(var(--border))" />
                  <text x={m.position + 6} y={HEADER_HEIGHT / 2 - 8} fontSize={11} fontWeight={600} fill="hsl(var(--foreground))">{m.label}</text>
                </g>
              ))}
              {dateMarkers.map((d, i) => (
                <g key={`d-${i}`}>
                  {d.isWeekend && (
                    <rect x={d.position} y={HEADER_HEIGHT/2} width={dayWidth} height={HEADER_HEIGHT/2} fill="hsl(var(--muted))" opacity={0.4}/>
                  )}
                  <text x={d.position + dayWidth / 2} y={HEADER_HEIGHT - 8} textAnchor="middle" fontSize={10}
                    fill={d.isToday ? "hsl(var(--destructive))" : "hsl(var(--muted-foreground))"}
                    fontWeight={d.isToday ? 700 : 400}>
                    {d.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Body */}
        <div className="flex" style={{ height: "min(70vh, 600px)" }}>
          {/* Sidebar */}
          <div ref={sidebarScrollRef} className="flex-shrink-0 overflow-y-auto overflow-x-hidden border-r" style={{ width: SIDEBAR_WIDTH }}>
            {visibleRows.map(row => (
              <SidebarRow key={row.key} row={row} expanded={expanded.has(row.key)} onToggle={() => toggleExpand(row.key)} />
            ))}
            <div style={{ height: 1 }}/>
          </div>

          {/* Timeline */}
          <div ref={timelineScrollRef} className="flex-1 overflow-auto relative">
            <svg width={totalWidth} height={Math.max(totalHeight, 1)} className="block">
              {/* Row backgrounds + grid */}
              {visibleRows.map((row, i) => (
                <rect key={`bg-${row.key}`} x={0} y={i * ROW_HEIGHT} width={totalWidth} height={ROW_HEIGHT}
                  fill={i % 2 === 0 ? "transparent" : "hsl(var(--muted) / 0.25)"} />
              ))}
              {dateMarkers.map((d, i) => (
                <g key={`g-${i}`}>
                  {d.isWeekend && (
                    <rect x={d.position} y={0} width={dayWidth} height={totalHeight} fill="hsl(var(--muted))" opacity={0.15}/>
                  )}
                  <line x1={d.position} y1={0} x2={d.position} y2={totalHeight} stroke="hsl(var(--border))" opacity={0.3}/>
                </g>
              ))}
              {/* Today line */}
              {todayX >= 0 && todayX <= totalWidth && (
                <line x1={todayX} y1={0} x2={todayX} y2={totalHeight} stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="4 4" />
              )}
              {/* Bars */}
              {visibleRows.map((row, i) => (
                <BarRow key={row.key} row={row} index={i} bounds={bounds} dayWidth={dayWidth} onClick={() => setDrawerKey(row.key)} />
              ))}
            </svg>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 px-3 py-2 border-t text-xs items-center">
          <span className="text-muted-foreground font-medium">Status:</span>
          {(Object.keys(STATUS_COLOURS) as Array<keyof typeof STATUS_COLOURS>).map(s => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-3 w-4 rounded" style={{ background: STATUS_COLOURS[s].fill }}/>
              {STATUS_COLOURS[s].label}
            </span>
          ))}
          <span className="ml-auto text-muted-foreground">{visibleRows.length} rows · {data.rows.size} total</span>
        </div>
      </Card>

      {/* Detail drawer */}
      <Sheet open={!!drawerKey} onOpenChange={(o) => !o && setDrawerKey(null)}>
        <SheetContent>
          {drawerRow && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[10px] uppercase font-semibold rounded px-1.5 py-0.5", KIND_BADGE_BG[drawerRow.kind])}>
                    {KIND_LABEL[drawerRow.kind]}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded text-white" style={{ background: STATUS_COLOURS[drawerRow.status].fill }}>
                    {STATUS_COLOURS[drawerRow.status].label}
                  </span>
                </div>
                <SheetTitle className="text-left">{drawerRow.title}</SheetTitle>
                <SheetDescription className="text-left">
                  {drawerRow.start || drawerRow.end ? (
                    <>{formatDateUK(drawerRow.start)} → {formatDateUK(drawerRow.end)}</>
                  ) : "No dates set"}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-3 text-sm">
                {drawerRow.raw?.description && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">Description</div>
                    <div className="whitespace-pre-wrap">{drawerRow.raw.description}</div>
                  </div>
                )}
                {drawerRow.childKeys.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1">
                      Children ({drawerRow.childKeys.length})
                    </div>
                    <ul className="space-y-1">
                      {drawerRow.childKeys.map(k => {
                        const c = data.rows.get(k);
                        if (!c) return null;
                        return (
                          <li key={k}>
                            <button className="text-left hover:underline" onClick={() => setDrawerKey(k)}>
                              <span className="text-[10px] uppercase font-semibold mr-2 opacity-70">{KIND_LABEL[c.kind]}</span>
                              {c.title}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}

function SidebarRow({ row, expanded, onToggle }: { row: GospaGanttRow; expanded: boolean; onToggle: () => void }) {
  const hasChildren = row.childKeys.length > 0;
  return (
    <div
      className="flex items-center gap-1 border-b text-sm hover:bg-accent/40"
      style={{ height: ROW_HEIGHT, paddingLeft: 8 + row.depth * 16 }}
    >
      {hasChildren ? (
        <button onClick={onToggle} className="p-0.5 hover:bg-accent rounded" aria-label={expanded ? "Collapse" : "Expand"}>
          {expanded ? <ChevronDown className="h-3.5 w-3.5"/> : <ChevronRight className="h-3.5 w-3.5"/>}
        </button>
      ) : <span className="w-4"/>}
      <span className={cn("text-[9px] uppercase font-semibold rounded px-1 py-0.5 shrink-0", KIND_BADGE_BG[row.kind])}>
        {row.kind === "objective" ? "OBJ" : row.kind === "strategy" ? "STR" : row.kind === "action" ? "ACT" : row.kind.slice(0, 3).toUpperCase()}
      </span>
      <span className={cn("truncate flex-1", row.kind === "goal" && "font-semibold", row.kind === "objective" && "font-medium")}
        title={row.title}>
        {row.title}
      </span>
    </div>
  );
}

function BarRow({ row, index, bounds, dayWidth, onClick }: {
  row: GospaGanttRow; index: number; bounds: { start: Date; end: Date }; dayWidth: number; onClick: () => void;
}) {
  if (!row.start || !row.end) return null;
  const x = dateToX(row.start, bounds.start, dayWidth);
  const width = Math.max(dayWidth * 0.5, dateToX(row.end, bounds.start, dayWidth) - x + dayWidth);
  const y = index * ROW_HEIGHT + 6;
  const h = ROW_HEIGHT - 12;
  const colour = STATUS_COLOURS[row.status];
  // Parent rows (goal/objective/strategy) are rendered as thinner outlined bars
  const isParent = row.kind === "goal" || row.kind === "objective" || row.kind === "strategy";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g style={{ cursor: "pointer" }} onClick={onClick}>
          <rect
            x={x} y={y} width={width} height={h}
            rx={4}
            fill={colour.fill}
            opacity={isParent ? 0.55 : 0.95}
            stroke={isParent ? colour.fill : "hsl(var(--background))"}
            strokeWidth={isParent ? 1.5 : 0.5}
          />
          {width > 60 && (
            <text x={x + 6} y={y + h / 2 + 3} fontSize={10} fill={colour.text} style={{ pointerEvents: "none" }}>
              {row.title.length > Math.floor(width / 7) ? row.title.slice(0, Math.floor(width / 7) - 1) + "…" : row.title}
            </text>
          )}
        </g>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <div className="font-semibold">{row.title}</div>
          <div className="text-muted-foreground">{KIND_LABEL[row.kind]} · {STATUS_COLOURS[row.status].label}</div>
          <div>{formatDateUK(row.start)} → {formatDateUK(row.end)}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
