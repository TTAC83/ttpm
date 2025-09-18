-- 1) Status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'feature_request_status_enum') then
    create type feature_request_status_enum as enum (
      'Requested','Rejected','In Design','In Dev','Complete'
    );
  end if;
end$$;

-- 2) Table
create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  problem_statement text,
  user_story_role text,     -- "I am a ..."
  user_story_goal text,     -- "I would like ..."
  user_story_outcome text,  -- "So I can ..."
  solution_overview text,
  requirements text,
  status feature_request_status_enum not null default 'Requested',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) Updated_at trigger (reuse existing function)
drop trigger if exists trg_feature_requests_touch on public.feature_requests;
create trigger trg_feature_requests_touch
before update on public.feature_requests
for each row execute procedure public.update_updated_at_column();

-- 4) RLS: internal-only read/write
alter table public.feature_requests enable row level security;

drop policy if exists fr_select on public.feature_requests;
create policy fr_select on public.feature_requests
for select using ( is_internal() );

drop policy if exists fr_insert on public.feature_requests;
create policy fr_insert on public.feature_requests
for insert with check ( is_internal() );

drop policy if exists fr_update on public.feature_requests;
create policy fr_update on public.feature_requests
for update using ( is_internal() ) with check ( is_internal() );

drop policy if exists fr_delete on public.feature_requests;
create policy fr_delete on public.feature_requests
for delete using ( is_internal() );

-- 5) Simple view for "My Requests" (optional convenience)
create or replace view public.v_my_feature_requests as
select * from public.feature_requests where created_by = auth.uid();