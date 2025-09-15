-- Enums
create type if not exists impl_week_status as enum ('on_track','off_track');
create type if not exists impl_health_simple as enum ('green','red');

-- Week registry (Mondays)
create table if not exists impl_weekly_weeks (
  week_start date primary key,          -- Monday
  week_end date not null,               -- Sunday
  available_at timestamptz not null,    -- Monday 00:01 Europe/London (stored in UTC instant)
  created_at timestamptz default now()
);

-- Review per (company × week)
create table if not exists impl_weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  week_start date not null references impl_weekly_weeks(week_start) on delete cascade,
  week_end date not null,
  project_status impl_week_status null,
  customer_health impl_health_simple null,
  notes text null,
  reviewed_by uuid not null references auth.users(id),
  reviewed_at timestamptz not null default now(),
  unique(company_id, week_start)
);

-- Indexes
create index if not exists idx_impl_weeks_available on impl_weekly_weeks(available_at);
create index if not exists idx_impl_reviews_company_week on impl_weekly_reviews(company_id, week_start);

-- Helper (if missing)
create or replace function is_internal() returns boolean language sql stable as
$$ select coalesce((select is_internal from profiles where user_id = auth.uid()), false) $$;

-- RLS
alter table impl_weekly_weeks enable row level security;
alter table impl_weekly_reviews enable row level security;

drop policy if exists read_impl_weeks on impl_weekly_weeks;
create policy read_impl_weeks on impl_weekly_weeks for select using ( is_internal() );

drop policy if exists write_impl_weeks on impl_weekly_weeks;
create policy write_impl_weeks on impl_weekly_weeks for all using ( is_internal() ) with check ( is_internal() );

drop policy if exists read_impl_reviews on impl_weekly_reviews;
create policy read_impl_reviews on impl_weekly_reviews for select using ( is_internal() );

drop policy if exists write_impl_reviews on impl_weekly_reviews;
create policy write_impl_reviews on impl_weekly_reviews for all using ( is_internal() ) with check ( is_internal() );

-- View: companies with any Implementation project
create or replace view v_impl_companies as
select distinct c.id as company_id, c.name as company_name
from companies c
join projects p on p.company_id = c.id
where p.domain in ('IoT','Vision','Hybrid');

-- RPC: generate weeks from first Monday of Aug 2024 through next Monday (inclusive)
create or replace function impl_generate_weeks()
returns void
language plpgsql
security definer
as $$
declare
  tz text := 'Europe/London';
  first_aug date := make_date(2024,8,1);
  monday date;
  cur date;
  next_monday date;
  avail timestamptz;
begin
  -- first Monday on/after 1 Aug 2024
  monday := first_aug + ((8 + 1 - extract(dow from first_aug))::int % 7);
  -- next Monday relative to now()
  next_monday := (date_trunc('week', (now() at time zone tz)) + interval '7 days')::date;

  cur := monday;
  while cur <= next_monday loop
    avail := (cur at time zone tz) + interval '1 minute'; -- Monday 00:01 London
    insert into impl_weekly_weeks(week_start, week_end, available_at)
    values (cur, cur + 6, avail)
    on conflict (week_start) do update
      set week_end = excluded.week_end,
          available_at = excluded.available_at;
    cur := cur + 7;
  end loop;
end;
$$;

-- RPC: upsert a weekly review row
create or replace function impl_set_weekly_review(
  p_company_id uuid,
  p_week_start date,
  p_project_status impl_week_status,
  p_customer_health impl_health_simple,
  p_notes text default null
)
returns void
language sql
security definer
as $$
  insert into impl_weekly_reviews(company_id, week_start, week_end, project_status, customer_health, notes, reviewed_by)
  select p_company_id, w.week_start, w.week_end, p_project_status, p_customer_health, p_notes, auth.uid()
  from impl_weekly_weeks w
  where w.week_start = p_week_start
  on conflict (company_id, week_start) do update
  set project_status = excluded.project_status,
      customer_health = excluded.customer_health,
      notes = excluded.notes,
      reviewed_by = auth.uid(),
      reviewed_at = now();
$$;