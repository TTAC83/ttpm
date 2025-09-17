-- 1) Status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'implementation_blocker_status_enum') then
    create type implementation_blocker_status_enum as enum ('Live','Closed');
  end if;
end$$;

-- 2) Blockers table
create table if not exists public.implementation_blockers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status implementation_blocker_status_enum not null default 'Live',
  raised_at timestamptz not null default now(),
  estimated_complete_date date,
  owner uuid not null references public.profiles(user_id),
  created_by uuid not null references auth.users(id),
  closed_at timestamptz,
  resolution_notes text,
  updated_at timestamptz not null default now()
);

-- 3) Update notes (timeline) table
create table if not exists public.implementation_blocker_updates (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.implementation_blockers(id) on delete cascade,
  note text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

-- 4) Attachments table (separate from action attachments)
create table if not exists public.implementation_blocker_attachments (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.implementation_blockers(id) on delete cascade,
  file_path text not null,
  file_name text not null,
  mime_type text,
  size_bytes integer,
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now()
);

-- 5) RLS: INTERNAL ONLY
alter table public.implementation_blockers enable row level security;
alter table public.implementation_blocker_updates enable row level security;
alter table public.implementation_blocker_attachments enable row level security;

-- Read: internal users only
drop policy if exists impl_blockers_select on public.implementation_blockers;
create policy impl_blockers_select on public.implementation_blockers
for select using (
  public.is_internal()
);

-- Insert: internal users only
drop policy if exists impl_blockers_insert on public.implementation_blockers;
create policy impl_blockers_insert on public.implementation_blockers
for insert with check ( public.is_internal() );

-- Update: internal users only
drop policy if exists impl_blockers_update on public.implementation_blockers;
create policy impl_blockers_update on public.implementation_blockers
for update using ( public.is_internal() ) with check ( public.is_internal() );

-- Updates table
drop policy if exists impl_blocker_updates_select on public.implementation_blocker_updates;
create policy impl_blocker_updates_select on public.implementation_blocker_updates
for select using ( public.is_internal() );

drop policy if exists impl_blocker_updates_insert on public.implementation_blocker_updates;
create policy impl_blocker_updates_insert on public.implementation_blocker_updates
for insert with check ( public.is_internal() );

-- Attachments table
drop policy if exists impl_blocker_atts_select on public.implementation_blocker_attachments;
create policy impl_blocker_atts_select on public.implementation_blocker_attachments
for select using ( public.is_internal() );

drop policy if exists impl_blocker_atts_insert on public.implementation_blocker_attachments;
create policy impl_blocker_atts_insert on public.implementation_blocker_attachments
for insert with check ( public.is_internal() );

-- 6) Constraint: Implementation projects only
create or replace function public.ensure_impl_project() returns trigger
language plpgsql as $$
declare
  d text;
begin
  select p.domain::text into d from public.projects p where p.id = new.project_id;
  if d is null then
    raise exception 'Invalid project';
  end if;
  -- Treat only "IoT", "Vision", "Hybrid" as implementation domains
  if d not in ('IoT','Vision','Hybrid') then
    raise exception 'Blockers allowed for Implementation projects only. Domain=%, id=%', d, new.project_id;
  end if;
  return new;
end$$;

drop trigger if exists trg_impl_blockers_domain on public.implementation_blockers;
create trigger trg_impl_blockers_domain before insert or update
on public.implementation_blockers
for each row execute procedure public.ensure_impl_project();

-- 7) Validation: closing requires resolution notes + closed_at auto
create or replace function public.impl_blockers_validate_close() returns trigger
language plpgsql as $$
begin
  if new.status = 'Closed' then
    if coalesce(new.resolution_notes, '') = '' then
      raise exception 'Resolution notes are required to close a blocker';
    end if;
    if new.closed_at is null then
      new.closed_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end$$;

drop trigger if exists trg_impl_blockers_close on public.implementation_blockers;
create trigger trg_impl_blockers_close before update
on public.implementation_blockers
for each row execute procedure public.impl_blockers_validate_close();

-- 8) Dashboard view: open blockers with computed fields
create or replace view public.v_impl_open_blockers as
select
  b.id,
  b.project_id,
  p.name as project_name,
  c.name as customer_name,
  b.title,
  b.estimated_complete_date,
  b.raised_at,
  (current_date - b.raised_at::date) as age_days,
  case
    when b.estimated_complete_date is not null and current_date > b.estimated_complete_date then true
    else false
  end as is_overdue,
  b.owner,
  b.status
from public.implementation_blockers b
join public.projects p on p.id = b.project_id
join public.companies c on c.id = p.company_id
where b.status = 'Live';