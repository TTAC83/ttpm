-- Enums
CREATE TYPE impl_week_status AS ENUM ('on_track','off_track');
CREATE TYPE impl_health_simple AS ENUM ('green','red');

-- Week registry (Mondays)
CREATE TABLE impl_weekly_weeks (
  week_start date primary key,          -- Monday
  week_end date not null,               -- Sunday
  available_at timestamptz not null,    -- Monday 00:01 Europe/London (stored in UTC instant)
  created_at timestamptz default now()
);

-- Review per (company × week)
CREATE TABLE impl_weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  week_start date not null references impl_weekly_weeks(week_start) on delete cascade,
  week_end date not null,
  project_status impl_week_status null,
  customer_health impl_health_simple null,
  notes text null,
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now(),
  unique(company_id, week_start)
);

-- Indexes
CREATE INDEX idx_impl_weeks_available ON impl_weekly_weeks(available_at);
CREATE INDEX idx_impl_reviews_company_week ON impl_weekly_reviews(company_id, week_start);

-- RLS
ALTER TABLE impl_weekly_weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE impl_weekly_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS read_impl_weeks ON impl_weekly_weeks;
CREATE POLICY read_impl_weeks ON impl_weekly_weeks FOR SELECT USING ( is_internal() );

DROP POLICY IF EXISTS write_impl_weeks ON impl_weekly_weeks;
CREATE POLICY write_impl_weeks ON impl_weekly_weeks FOR ALL USING ( is_internal() ) WITH CHECK ( is_internal() );

DROP POLICY IF EXISTS read_impl_reviews ON impl_weekly_reviews;
CREATE POLICY read_impl_reviews ON impl_weekly_reviews FOR SELECT USING ( is_internal() );

DROP POLICY IF EXISTS write_impl_reviews ON impl_weekly_reviews;
CREATE POLICY write_impl_reviews ON impl_weekly_reviews FOR ALL USING ( is_internal() ) WITH CHECK ( is_internal() );

-- View: companies with any Implementation project
CREATE OR REPLACE VIEW v_impl_companies AS
SELECT DISTINCT c.id as company_id, c.name as company_name
FROM companies c
JOIN projects p ON p.company_id = c.id
WHERE p.domain IN ('IoT','Vision','Hybrid');

-- RPC: generate weeks from first Monday of Aug 2024 through next Monday (inclusive)
CREATE OR REPLACE FUNCTION impl_generate_weeks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
CREATE OR REPLACE FUNCTION impl_set_weekly_review(
  p_company_id uuid,
  p_week_start date,
  p_project_status impl_week_status,
  p_customer_health impl_health_simple,
  p_notes text default null
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  INSERT INTO impl_weekly_reviews(company_id, week_start, week_end, project_status, customer_health, notes, reviewed_by)
  SELECT p_company_id, w.week_start, w.week_end, p_project_status, p_customer_health, p_notes, auth.uid()
  FROM impl_weekly_weeks w
  WHERE w.week_start = p_week_start
  ON CONFLICT (company_id, week_start) DO UPDATE
  SET project_status = excluded.project_status,
      customer_health = excluded.customer_health,
      notes = excluded.notes,
      reviewed_by = auth.uid(),
      reviewed_at = now();
$$;