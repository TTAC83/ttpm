## Metrics Tracking Feature — Plan

A new top-level section to define metrics with target values, schedule review meetings, log readings against targets, and raise actions when targets are missed.

### Scope (this iteration)
1. Framework to **create & list metrics** (title, category, description, owner, target value, unit, direction)
2. **Review meetings** scheduled against a metric (or group of metrics)
3. In each meeting, **enter the actual value** — if target missed, the metric block goes **red**
4. **Create actions** from inside a meeting using the existing `actions` table (reuse, not duplicate)

Out of scope: dashboards/charts beyond a simple sparkline, automated data feeds, approvals.

---

### Navigation
- New top-level item **"Metrics"** in `src/config/nav.ts`, positioned immediately after **GOSPA**, icon `LineChart` (lucide), roles: internal_admin + internal_user.
- Children:
  - **Dashboard** — `/app/metrics` (grid of metric cards, red/green status)
  - **All Metrics** — `/app/metrics/list` (table)
  - **Meetings** — `/app/metrics/meetings`

### Pages / Components
```
src/pages/app/metrics/
  MetricsDashboard.tsx     -- card grid, color-coded by latest reading vs target
  MetricsList.tsx          -- table + "New metric" button
  MetricDetail.tsx         -- metric history (table + sparkline), meetings, actions
  NewMetricDialog.tsx
  MetricsMeetings.tsx      -- list of scheduled review meetings
  MeetingDetail.tsx        -- per-meeting: list of metrics in scope, value-entry inline,
                              "Add action" button reusing existing action infra
src/lib/metricsService.ts  -- CRUD + readings + meetings
src/hooks/useMetrics.ts
```

### Color logic
A reading is **on-target** when, depending on `direction`:
- `higher_is_better`: `actual >= target`
- `lower_is_better`:  `actual <= target`
- `on_target`:        `abs(actual - target) <= tolerance`

The metric card uses the **latest reading** to pick red vs green (existing semantic tokens `--destructive` / `--primary`). No new colors.

### Reusing the Actions framework
- Add nullable `metric_id uuid` and `metric_meeting_id uuid` columns to the existing `public.actions` table.
- From a meeting, "Add action" opens the same `EditActionDialog`/creation flow, pre-filling `metric_id` + `metric_meeting_id`.
- Metric detail page shows linked actions via a filtered query on `actions`.

---

### Database (new migration — to be approved separately)

```sql
-- enums
create type metric_category as enum ('financial','operational','customer','people','quality','other');
create type metric_direction as enum ('higher_is_better','lower_is_better','on_target');
create type metric_meeting_status as enum ('scheduled','in_progress','completed','cancelled');

-- metrics
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category metric_category not null default 'operational',
  description text,
  owner uuid references public.profiles(user_id),
  unit text,
  target_value numeric,
  direction metric_direction not null default 'higher_is_better',
  tolerance numeric default 0,
  is_archived boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- review meetings (one meeting can cover multiple metrics)
create table public.metric_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_at timestamptz not null,
  status metric_meeting_status not null default 'scheduled',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metric_meeting_items (
  meeting_id uuid references public.metric_meetings(id) on delete cascade,
  metric_id uuid references public.metrics(id) on delete cascade,
  primary key (meeting_id, metric_id)
);

-- readings (entered manually during a meeting, or ad-hoc)
create table public.metric_readings (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.metrics(id) on delete cascade,
  meeting_id uuid references public.metric_meetings(id) on delete set null,
  period_date date not null,           -- which period this value represents
  actual_value numeric not null,
  on_target boolean not null,          -- computed in app, stored for fast queries
  commentary text,
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- link actions to metrics / meetings
alter table public.actions
  add column metric_id uuid references public.metrics(id) on delete set null,
  add column metric_meeting_id uuid references public.metric_meetings(id) on delete set null;

-- RLS: internal users only (matches existing internal-only modules)
-- (policies + updated_at triggers included in the migration)
```

### Routing
- Add routes in `src/App.tsx` under `/app/metrics/*` guarded by `InternalRoute`.

### UI notes
- Cards: large value, target underneath, trend arrow vs previous reading, red border + `AlertTriangle` when latest reading missed target.
- Meeting screen: table of in-scope metrics, inline numeric input per row, "Save reading" auto-computes on-target and persists. "Add action" opens existing dialog.
- All copy plain English, semantic tokens only, no hardcoded colors.

### Open questions (will infer defaults if not answered)
1. Should metrics be **company-wide** or scoped to a project/customer? Default: company-wide.
2. Reading **cadence** — fixed (weekly/monthly) on the metric, or freeform? Default: freeform `period_date`.
3. Meetings: do you want **recurring schedules** (e.g. every Monday), or just create-as-needed? Default: create-as-needed for v1.
