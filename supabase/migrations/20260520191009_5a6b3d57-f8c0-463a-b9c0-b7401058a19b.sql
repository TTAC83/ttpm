
-- enums
create type public.metric_category as enum ('financial','operational','customer','people','quality','other');
create type public.metric_direction as enum ('higher_is_better','lower_is_better','on_target');
create type public.metric_meeting_status as enum ('scheduled','in_progress','completed','cancelled');

-- helper: is_internal_user (reuse pattern via profiles)
create or replace function public.current_user_is_internal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_internal from public.profiles where user_id = auth.uid()), false);
$$;

-- metrics
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category public.metric_category not null default 'operational',
  description text,
  owner uuid,
  unit text,
  target_value numeric,
  direction public.metric_direction not null default 'higher_is_better',
  tolerance numeric default 0,
  is_archived boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metric_meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scheduled_at timestamptz not null,
  status public.metric_meeting_status not null default 'scheduled',
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.metric_meeting_items (
  meeting_id uuid not null references public.metric_meetings(id) on delete cascade,
  metric_id uuid not null references public.metrics(id) on delete cascade,
  primary key (meeting_id, metric_id)
);

create table public.metric_readings (
  id uuid primary key default gen_random_uuid(),
  metric_id uuid not null references public.metrics(id) on delete cascade,
  meeting_id uuid references public.metric_meetings(id) on delete set null,
  period_date date not null,
  actual_value numeric not null,
  on_target boolean not null,
  commentary text,
  entered_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_metric_readings_metric on public.metric_readings(metric_id, period_date desc);
create index idx_metric_meeting_items_metric on public.metric_meeting_items(metric_id);

-- link actions to metrics
alter table public.actions
  add column metric_id uuid references public.metrics(id) on delete set null,
  add column metric_meeting_id uuid references public.metric_meetings(id) on delete set null;

-- enable RLS
alter table public.metrics enable row level security;
alter table public.metric_meetings enable row level security;
alter table public.metric_meeting_items enable row level security;
alter table public.metric_readings enable row level security;

-- policies: internal users full access
create policy "internal read metrics" on public.metrics for select using (public.current_user_is_internal());
create policy "internal write metrics" on public.metrics for insert with check (public.current_user_is_internal());
create policy "internal update metrics" on public.metrics for update using (public.current_user_is_internal());
create policy "internal delete metrics" on public.metrics for delete using (public.current_user_is_internal());

create policy "internal read meetings" on public.metric_meetings for select using (public.current_user_is_internal());
create policy "internal write meetings" on public.metric_meetings for insert with check (public.current_user_is_internal());
create policy "internal update meetings" on public.metric_meetings for update using (public.current_user_is_internal());
create policy "internal delete meetings" on public.metric_meetings for delete using (public.current_user_is_internal());

create policy "internal read meeting_items" on public.metric_meeting_items for select using (public.current_user_is_internal());
create policy "internal write meeting_items" on public.metric_meeting_items for insert with check (public.current_user_is_internal());
create policy "internal delete meeting_items" on public.metric_meeting_items for delete using (public.current_user_is_internal());

create policy "internal read readings" on public.metric_readings for select using (public.current_user_is_internal());
create policy "internal write readings" on public.metric_readings for insert with check (public.current_user_is_internal());
create policy "internal update readings" on public.metric_readings for update using (public.current_user_is_internal());
create policy "internal delete readings" on public.metric_readings for delete using (public.current_user_is_internal());

-- updated_at triggers (reuse existing function)
create trigger trg_metrics_updated_at before update on public.metrics
  for each row execute function public.update_updated_at_column();
create trigger trg_metric_meetings_updated_at before update on public.metric_meetings
  for each row execute function public.update_updated_at_column();
