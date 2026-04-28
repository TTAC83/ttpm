import { useQuery } from "@tanstack/react-query";
import { gospa } from "@/lib/gospaService";
import type { GospaGanttKind, GospaGanttRow, GospaGanttStatus, GospaGanttTree } from "./types";

const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const parseDate = (v: string | null | undefined): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const mapStatus = (s: string | null | undefined, end: Date | null): GospaGanttStatus => {
  const v = (s ?? "").toLowerCase().replace(/\s+/g, "_");
  if (v === "blocked") return "blocked";
  if (v === "done" || v === "completed") return "done";
  if (v === "in_progress") {
    if (end && end < today()) return "overdue";
    return "in_progress";
  }
  if (end && end < today()) return "overdue";
  return "not_started";
};

const rollupStatus = (children: GospaGanttRow[]): GospaGanttStatus => {
  if (!children.length) return "not_started";
  if (children.some(c => c.status === "blocked")) return "blocked";
  if (children.some(c => c.status === "overdue")) return "overdue";
  if (children.every(c => c.status === "done")) return "done";
  if (children.some(c => c.status === "in_progress" || c.status === "done")) return "in_progress";
  return "not_started";
};

const rollupDates = (children: GospaGanttRow[]): { start: Date | null; end: Date | null } => {
  const starts = children.map(c => c.start).filter((d): d is Date => !!d);
  const ends = children.map(c => c.end).filter((d): d is Date => !!d);
  return {
    start: starts.length ? new Date(Math.min(...starts.map(d => d.getTime()))) : null,
    end: ends.length ? new Date(Math.max(...ends.map(d => d.getTime()))) : null,
  };
};

export function useGospaGanttData() {
  return useQuery({
    queryKey: ["gospa-gantt-data"],
    queryFn: async (): Promise<GospaGanttTree> => {
      const [goalsR, objsR, stratsR, plansR, actionsR] = await Promise.all([
        gospa.listGoals(),
        gospa.listObjectives(),
        gospa.listStrategies(),
        gospa.listPlans(),
        gospa.listActions(),
      ]);

      const goals = goalsR.data ?? [];
      const objectives = objsR.data ?? [];
      const strategies = stratsR.data ?? [];
      const plans = plansR.data ?? [];
      const actions = actionsR.data ?? [];

      const rows = new Map<string, GospaGanttRow>();
      const makeKey = (kind: GospaGanttKind, id: string) => `${kind}:${id}`;

      // Actions (leaves)
      const actionRows: GospaGanttRow[] = actions
        .filter(a => a.gospa_plan_id) // only those linked to a plan
        .map(a => {
          const start = parseDate(a.planned_start as any);
          const end = parseDate(a.planned_end as any);
          const row: GospaGanttRow = {
            key: makeKey("action", a.id),
            id: a.id,
            kind: "action",
            title: a.task_title || "(untitled action)",
            parentKey: makeKey("plan", a.gospa_plan_id as string),
            depth: 4,
            start,
            end,
            status: mapStatus(a.status as any, end),
            childKeys: [],
            raw: a,
          };
          return row;
        });

      // Plans
      const planRows: GospaGanttRow[] = plans.map(p => {
        const myActions = actionRows.filter(a => a.parentKey === makeKey("plan", p.id));
        const start = parseDate(p.start_date) ?? rollupDates(myActions).start;
        const end = parseDate(p.end_date) ?? rollupDates(myActions).end;
        const status: GospaGanttStatus =
          mapStatus(p.status as any, end) === "not_started" && myActions.length
            ? rollupStatus(myActions)
            : mapStatus(p.status as any, end);
        return {
          key: makeKey("plan", p.id),
          id: p.id,
          kind: "plan",
          title: p.title,
          parentKey: makeKey("strategy", p.strategy_id),
          depth: 3,
          start,
          end,
          status,
          childKeys: myActions.map(a => a.key),
          raw: p,
        };
      });

      // Strategies
      const strategyRows: GospaGanttRow[] = strategies.map(s => {
        const myPlans = planRows.filter(p => p.parentKey === makeKey("strategy", s.id));
        const { start, end } = rollupDates(myPlans);
        return {
          key: makeKey("strategy", s.id),
          id: s.id,
          kind: "strategy",
          title: s.title,
          parentKey: makeKey("objective", s.objective_id),
          depth: 2,
          start,
          end,
          status: rollupStatus(myPlans),
          childKeys: myPlans.map(p => p.key),
          raw: s,
        };
      });

      // Objectives
      const objectiveRows: GospaGanttRow[] = objectives.map(o => {
        const myStrats = strategyRows.filter(s => s.parentKey === makeKey("objective", o.id));
        const { start, end } = rollupDates(myStrats);
        return {
          key: makeKey("objective", o.id),
          id: o.id,
          kind: "objective",
          title: o.title,
          parentKey: makeKey("goal", o.goal_id),
          depth: 1,
          start,
          end,
          status: rollupStatus(myStrats),
          childKeys: myStrats.map(s => s.key),
          raw: o,
        };
      });

      // Goals
      const goalRows: GospaGanttRow[] = goals.map(g => {
        const myObjs = objectiveRows.filter(o => o.parentKey === makeKey("goal", g.id));
        const { start, end } = rollupDates(myObjs);
        return {
          key: makeKey("goal", g.id),
          id: g.id,
          kind: "goal",
          title: g.title,
          parentKey: null,
          depth: 0,
          start,
          end,
          status: rollupStatus(myObjs),
          childKeys: myObjs.map(o => o.key),
          raw: g,
        };
      });

      [...goalRows, ...objectiveRows, ...strategyRows, ...planRows, ...actionRows].forEach(r => rows.set(r.key, r));

      return {
        rows,
        rootKeys: goalRows.map(g => g.key),
      };
    },
    staleTime: 60_000,
  });
}
