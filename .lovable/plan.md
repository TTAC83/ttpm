## GOSPA Timeline — Gantt Chart View

Replace the current list-based `GospaTimeline` page with an interactive SVG Gantt chart that visualises the GOSPA hierarchy across time.

### Data model on the chart

Rows are grouped hierarchically (collapsible):

```text
Goal
  └── Objective                  (rolled-up bar: min start → max end of its plans/actions)
        └── Strategy             (rolled-up bar)
              └── Plan           (gospa_plans.start_date → end_date)
                    └── Action   (project_tasks where gospa_flag=true: planned_start → planned_end)
```

- Items without dates are still listed in the sidebar but rendered with a muted "no dates" placeholder bar at today.
- Bar colour follows existing GOSPA status (`not_started`, `in_progress`, `done`, `blocked`) + RAG override for plans, mapped to the same palette used by `StatusPill` / `RAGBadge`.

### Page layout (`src/pages/app/gospa/Timeline.tsx`)

Top toolbar:
- Filters: Goal selector, Objective selector, Status multi-select, "Show actions" toggle, "Show plans only" toggle.
- View controls: Zoom in/out (reuse `ZOOM_LEVELS`), "Fit to window", "Today" jump button, Expand/Collapse all.
- Export: PNG + CSV buttons (reuse approach from `ganttExportService` — PNG via SVG serialise + canvas; CSV from flattened rows).

Body:
- Custom SVG Gantt with sticky left sidebar (hierarchy tree with expand chevrons) and scrollable timeline. Header shows months on top row, weeks/days on bottom row depending on zoom.
- Today line (dashed, destructive colour). Weekend shading.
- Hover tooltip on each bar: title, owner, status, dates, parent chain.
- Click a bar → open a side drawer (reuse shadcn `Sheet`) with item details + link to the source workspace (Plan/Action edit, Strategy in `ObjectiveWorkspace`).

### New files

- `src/features/gospa-gantt/types.ts` — `GospaGanttRow`, `GospaGanttKind = 'goal'|'objective'|'strategy'|'plan'|'action'`.
- `src/features/gospa-gantt/useGospaGanttData.ts` — single TanStack query that fetches goals, objectives, strategies, plans, and actions in parallel, then assembles the tree and computes rolled-up date ranges + status for parent rows.
- `src/features/gospa-gantt/buildTimeline.ts` — pure helpers: `flattenVisibleRows(tree, expandedSet)`, `computeBounds(rows)`, `generateDateMarkers(start, end, dayWidth, zoom)` (reuse logic from `dateCalculationService` where possible — import directly, no duplication needed).
- `src/features/gospa-gantt/GospaGanttChart.tsx` — orchestrator (toolbar + sidebar + SVG timeline + drawer).
- `src/features/gospa-gantt/GospaGanttSidebar.tsx` — virtualised hierarchy list with chevrons, indentation, kind badge.
- `src/features/gospa-gantt/GospaGanttBars.tsx` — renders the SVG bars; reuses `GRID_LINE_COLOR`, `GRID_WEEKEND_COLOR`, `ROW_HEIGHT`, `SIDEBAR_WIDTH`, `HEADER_HEIGHT` from `src/features/gantt/utils/ganttConstants.ts`.
- `src/features/gospa-gantt/GospaGanttExport.ts` — PNG (SVG → canvas → blob) and CSV exporters.

### Modified files

- `src/pages/app/gospa/Timeline.tsx` — replace the current list with `<GospaGanttChart />` and a small fallback list view toggle at the top right ("Gantt | List") so the existing simple list remains accessible.

### Technical details

- **Date positioning**: x = `((date - timelineStart) / 86400000) * dayWidth`; bar width = max(1 day, end - start).
- **Rolled-up dates** for objective/strategy: min(start) and max(end) over their descendant plans + actions; if none, hide the bar (sidebar still shows the row).
- **Rolled-up status**: blocked > overdue (planned_end < today AND not done) > in_progress > done > not_started.
- **Virtualisation**: use `@tanstack/react-virtual` (already in repo) for sidebar + bar rows when row count > 50.
- **Scroll sync**: header ↔ timeline horizontal scroll mirror; sidebar ↔ timeline vertical scroll mirror (same pattern as `GanttTimeline.tsx`).
- **Expand state**: persisted in component state keyed by `kind:id`; default expanded = all goals + objectives, collapsed = strategies/plans.
- **No DB changes** — purely client-side over the existing `gospa.*` service methods (already provide `listGoals`, `listObjectives`, `listStrategies`, `listPlans`, `listActions`).
- **No new packages** — reuses `date-fns`, `@tanstack/react-virtual`, `@tanstack/react-query`, shadcn primitives already installed.

### Out of scope (future iterations)

- Drag-resize bars to update dates (current Gantt does this for tasks/subtasks; we can add later for plans/actions only).
- Dependency arrows between actions.
- PDF export (PNG + CSV cover the immediate need).
