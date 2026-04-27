# GOSPA Execution Framework — Implementation Plan

A new **company-wide** strategic execution module inside TTPM, fully integrated with existing users, projects, and tasks. Delivered as a single full MVP.

---

## 1. Where it lives

- New top-level sidebar group **"GOSPA"** (icon: Target), visible to internal users.
  - Dashboard
  - Goals
  - Objective Workspace (deep link)
  - Strategy Tree
  - Timeline (Gantt)
  - Weekly Review
  - Metrics
- Routes under `/app/gospa/*` mounted in `src/App.tsx`.
- Internal-only via `InternalRoute`; edit gated by new `gospa_admin` role.

---

## 2. Data model (new tables)

All tables are **company-wide** (no project_id required). RLS: read = any authenticated internal user; write = `gospa_admin` OR record `owner = auth.uid()` (per the rules below).

```text
gospa_goals          (id, title, description, owner, timeframe_start, timeframe_end, status, created_at, updated_at)
gospa_objectives     (id, goal_id FK, title, description, owner, rag_status, target_outcome, order_index 1..6, strategic_direction TEXT, ai_summary TEXT)
gospa_questions      (id, objective_id FK, order_index 1..6, question_text, answer_text, evidence, risks, opportunities, confidence_score 0..100, owner, last_updated)
gospa_strategies     (id, objective_id FK, title, description, owner, status, rag_status)
gospa_plans          (id, strategy_id FK, title, description, owner, start_date, end_date, status)
gospa_metrics        (id, objective_id FK, name, description, owner, target_value NUMERIC, current_value NUMERIC, unit, frequency ENUM(weekly,monthly), trend ENUM(up,flat,down), data_source, last_updated)
gospa_metric_history (id, metric_id FK, value NUMERIC, recorded_at, recorded_by)   -- powers charts
gospa_decisions      (id, objective_id FK, description, decision_owner, decision_date, status)
gospa_blockers       (id, linked_type ENUM(objective,plan,action), linked_id UUID, description, severity ENUM(low,med,high,critical), owner, status)
gospa_weekly_reviews (id, week_start DATE UNIQUE, summary_md TEXT, generated_at, generated_by)
```

**Actions = existing `project_tasks` table, extended:**
```text
ALTER TABLE project_tasks ADD COLUMN gospa_plan_id UUID REFERENCES gospa_plans(id),
                          ADD COLUMN gospa_objective_id UUID REFERENCES gospa_objectives(id),
                          ADD COLUMN gospa_strategy_id UUID REFERENCES gospa_strategies(id),
                          ADD COLUMN gospa_flag BOOLEAN DEFAULT false;
```
- `project_id` and `solutions_project_id` remain nullable → enables **standalone GOSPA actions** (no project) as agreed.
- A trigger enforces: when `gospa_flag = true` then `gospa_plan_id IS NOT NULL` (no orphans).
- A relaxation migration drops the existing NOT NULL/XOR check on project ownership (if any) so a row can have only `gospa_plan_id`.

**Permissions:**
- Add `'gospa_admin'` to `app_role` enum.
- RLS uses existing `has_role(auth.uid(), 'gospa_admin')` pattern + `is_internal()` for read.
- Application-layer roles map to: Admin (gospa_admin or internal_admin), Objective Owner (record.owner = uid), Contributor (any internal — actions/plans only), Viewer (external users → read denied for now).

**Enums:** `gospa_status` (not_started, in_progress, blocked, done), `gospa_rag` (red, amber, green), `gospa_metric_freq`, `gospa_severity`.

---

## 3. UI screens

### A. GOSPA Dashboard `/app/gospa`
- Goal summary card (active goal + timeframe)
- Objective grid: RAG chip, % strategy completion, owner avatar
- KPI strip: overdue actions, open blockers, decisions awaiting
- Top metrics widget (current vs target, sparkline)
- "Upcoming weekly review" CTA → opens Weekly Review mode

### B. Objective Workspace `/app/gospa/objectives/:id`
Tabs / sections:
- **A. Questions** — 6 fixed question cards (auto-seeded on objective create) with always-editable answer / evidence / risks / opportunities / confidence slider. Auto-save on blur (per `useSaveWithRetry` rule).
- **B. Strategic Direction** — free-text + "Generate AI summary" button (edge function).
- **C. Strategies** — list, inline create, RAG + status.
- **D. Plans** — nested under each strategy; date range + owner.
- **E. Actions** — table of `project_tasks` where `gospa_objective_id = :id`. Inline create (writes to project_tasks with `gospa_flag=true`). Filter by plan / owner / status.

### C. Strategy-to-Execution Tree `/app/gospa/tree`
- Custom SVG tree (reuses Gantt SVG patterns from `src/features/gantt`):
  Goal → Objective → Strategy → Plan → Actions.
- Each node: owner avatar, status pill, RAG dot, progress %.
- Click node → drill into that record.

### D. Timeline / Gantt `/app/gospa/timeline`
- Reuses existing `src/features/gantt` SVG components (no Bryntum, per memory rule).
- Rows = Plans with nested Actions.
- Drag-and-drop to update `start_date/end_date` (plans) and `planned_start/planned_end` (actions).
- Filters: Objective, Owner.
- Dependency rendering reuses `GanttDependencyLines`.

### E. Weekly GOSPA Review `/app/gospa/weekly-review`
Meeting interface (left rail = objective list, main = panel):
- Per-objective panel: summary, metrics current vs target, due-this-week actions, overdue actions, open blockers, decisions required.
- In-line: create action, change status, log decision, update metric (writes `gospa_metric_history`).
- "Finish review" button → calls edge function `gospa-weekly-summary` → stores into `gospa_weekly_reviews.summary_md` and offers download.

### F. Metrics Module `/app/gospa/metrics`
- List + filter by objective.
- Detail drawer: line chart of `gospa_metric_history`, target line overlay, variance %, trend arrow.
- Manual entry form (records into `gospa_metric_history` and updates `current_value` + `trend` + `last_updated`).

---

## 4. Light AI helpers (Lovable AI Gateway)

Edge functions, all using `google/gemini-3-flash-preview` via `LOVABLE_API_KEY`:
- `gospa-summarise-questions` — input: 6 Q&A; output: strategic insight paragraph (writes `objectives.ai_summary`).
- `gospa-suggest-strategies` — input: objective + answers; output: 3–5 candidate strategies (returned to UI for the user to accept/reject).
- `gospa-quality-check` — server-side scan flagging objectives with: missing owner, missing dates on plans, low action progress vs target outcome, no metrics.
- `gospa-weekly-summary` — composes the weekly review markdown.

All called via `supabase.functions.invoke`; no client-side prompts.

---

## 5. Behaviour rules (enforced)

- Strategy → Objective: NOT NULL FK.
- Plan → Strategy: NOT NULL FK.
- Action `gospa_flag=true` → `gospa_plan_id NOT NULL` (DB trigger + UI guard).
- Setting `gospa_objective_id` on a task auto-derives `gospa_strategy_id` from its plan (trigger).
- Deleting an Objective cascades through Strategies/Plans/Questions/Metrics; Actions are detached (gospa fields nulled, gospa_flag=false) — no task deletion.

---

## 6. Files to be created / edited

**Migrations** (single migration file):
- New enums, tables, RLS policies, triggers, `gospa_admin` role.
- ALTER `project_tasks` (4 new columns + trigger).

**Edge functions:**
- `supabase/functions/gospa-summarise-questions/index.ts`
- `supabase/functions/gospa-suggest-strategies/index.ts`
- `supabase/functions/gospa-quality-check/index.ts`
- `supabase/functions/gospa-weekly-summary/index.ts`

**Frontend (new):**
- `src/lib/gospaService.ts` — typed CRUD + AI invokers.
- `src/hooks/useGospa*.ts` — TanStack queries.
- `src/pages/app/gospa/Dashboard.tsx`
- `src/pages/app/gospa/GoalsList.tsx`
- `src/pages/app/gospa/ObjectiveWorkspace.tsx`
- `src/pages/app/gospa/StrategyTree.tsx`
- `src/pages/app/gospa/Timeline.tsx`
- `src/pages/app/gospa/WeeklyReview.tsx`
- `src/pages/app/gospa/Metrics.tsx`
- `src/components/gospa/` — QuestionCard, StrategyCard, PlanCard, ActionTable, MetricChart, RAGBadge, OwnerPicker, BlockerDrawer, DecisionDialog, TreeNode.

**Frontend (edited):**
- `src/App.tsx` — register 7 GOSPA routes.
- `src/config/nav.ts` — new "GOSPA" group with sub-items.
- `src/integrations/supabase/types.ts` — auto-regenerated after migration.

---

## 7. Design language

- Executive minimal: cards on `bg-card`, RAG dots (red/amber/green semantic tokens), avatar stacks for owners, progress bars using `bg-primary`, monochrome icons (lucide).
- All inline edits use the **Always Editable** pattern (no Edit/Save toggle, save on blur) per project memory.
- All multi-step saves use `useSaveWithRetry`.

---

## 8. Build order (single delivery)

1. Migration (tables, enums, role, trigger, RLS, project_tasks ALTER).
2. `gospaService.ts` + hooks.
3. Goals list + Objective Workspace (Questions, Strategies, Plans, Actions).
4. Strategy Tree + Timeline (Gantt reuse).
5. Dashboard + Weekly Review + Metrics.
6. Four AI edge functions.
7. Nav + routes wiring + smoke test.

After approval I'll execute the migration first, then ship the code.
