-- BAU Weekly Review System Migration (Fixed for Policies)
-- Forward SQL migration (idempotent)

-- 1) Enums - Use DO block for conditional creation
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bau_health_simple') THEN
        CREATE TYPE bau_health_simple AS ENUM ('green','red');
    END IF;
END $$;

-- 2) Uploads registry (metadata only)
CREATE TABLE IF NOT EXISTS bau_weekly_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path text NOT NULL,          -- e.g. bau-weekly-uploads/2025-09-14.xlsx
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  notes text
);

-- 3) Metric catalog (optional but helpful for consistency)
CREATE TABLE IF NOT EXISTS bau_metric_catalog (
  id bigserial PRIMARY KEY,
  metric_key text UNIQUE,              -- e.g. 'uptime_pct', 'calls', 'incidents'
  label text,
  unit text
);

-- 4) Weekly metrics — tall format for trending/aggregation
CREATE TABLE IF NOT EXISTS bau_weekly_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bau_customer_id uuid NOT NULL REFERENCES bau_customers(id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to   date NOT NULL,
  metric_key text NOT NULL,            -- column header normalized
  metric_value_numeric numeric NULL,   -- if number
  metric_value_text text NULL,         -- fallback if text
  source_upload_id uuid NULL REFERENCES bau_weekly_uploads(id) ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bau_customer_id, date_from, date_to, metric_key)
);

-- 5) Weekly review outcome per customer/week
CREATE TABLE IF NOT EXISTS bau_weekly_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bau_customer_id uuid NOT NULL REFERENCES bau_customers(id) ON DELETE CASCADE,
  date_from date NOT NULL,
  date_to   date NOT NULL,
  health bau_health_simple NOT NULL DEFAULT 'green',
  escalation text NULL,
  reviewed_by uuid NOT NULL REFERENCES auth.users(id),
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(bau_customer_id, date_from, date_to)
);

-- 6) Optional helper: map free-text names to BAU customers (for ingestion)
CREATE TABLE IF NOT EXISTS bau_customer_aliases (
  id bigserial PRIMARY KEY,
  alias text NOT NULL,
  bau_customer_id uuid NOT NULL REFERENCES bau_customers(id) ON DELETE CASCADE,
  UNIQUE(alias)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_bwm_customer_dates ON bau_weekly_metrics(bau_customer_id, date_to, metric_key);
CREATE INDEX IF NOT EXISTS idx_bwr_customer_dates ON bau_weekly_reviews(bau_customer_id, date_to);
CREATE INDEX IF NOT EXISTS idx_bwm_metric_key ON bau_weekly_metrics(metric_key);
CREATE INDEX IF NOT EXISTS idx_bwau_uploaded ON bau_weekly_uploads(uploaded_at);

-- Enable RLS
ALTER TABLE bau_weekly_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bau_weekly_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bau_weekly_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE bau_customer_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE bau_metric_catalog ENABLE ROW LEVEL SECURITY;

-- Policies with conditional creation using DO blocks
DO $$
BEGIN
    -- Read rules: internal sees all; external only rows for bau_customers belonging to their company
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read_uploads' AND tablename = 'bau_weekly_uploads') THEN
        CREATE POLICY read_uploads ON bau_weekly_uploads
        FOR SELECT USING ( is_internal() OR EXISTS (
          SELECT 1 FROM bau_weekly_metrics m
          JOIN bau_customers bc ON bc.id = m.bau_customer_id
          WHERE m.source_upload_id = bau_weekly_uploads.id AND bc.company_id = user_company_id()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read_metrics' AND tablename = 'bau_weekly_metrics') THEN
        CREATE POLICY read_metrics ON bau_weekly_metrics
        FOR SELECT USING ( is_internal() OR EXISTS (
          SELECT 1 FROM bau_customers bc WHERE bc.id = bau_weekly_metrics.bau_customer_id AND bc.company_id = user_company_id()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read_reviews' AND tablename = 'bau_weekly_reviews') THEN
        CREATE POLICY read_reviews ON bau_weekly_reviews
        FOR SELECT USING ( is_internal() OR EXISTS (
          SELECT 1 FROM bau_customers bc WHERE bc.id = bau_weekly_reviews.bau_customer_id AND bc.company_id = user_company_id()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read_aliases' AND tablename = 'bau_customer_aliases') THEN
        CREATE POLICY read_aliases ON bau_customer_aliases
        FOR SELECT USING ( is_internal() );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'read_catalog' AND tablename = 'bau_metric_catalog') THEN
        CREATE POLICY read_catalog ON bau_metric_catalog
        FOR SELECT USING ( true );
    END IF;

    -- Write rules: internal may insert/update; external can write reviews for their company only
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write_metrics_internal' AND tablename = 'bau_weekly_metrics') THEN
        CREATE POLICY write_metrics_internal ON bau_weekly_metrics
        FOR ALL USING ( is_internal() ) WITH CHECK ( is_internal() );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write_reviews_internal' AND tablename = 'bau_weekly_reviews') THEN
        CREATE POLICY write_reviews_internal ON bau_weekly_reviews
        FOR ALL USING ( is_internal() OR EXISTS (
          SELECT 1 FROM bau_customers bc WHERE bc.id = bau_weekly_reviews.bau_customer_id AND bc.company_id = user_company_id()
        )) WITH CHECK ( is_internal() OR EXISTS (
          SELECT 1 FROM bau_customers bc WHERE bc.id = bau_weekly_reviews.bau_customer_id AND bc.company_id = user_company_id()
        ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write_uploads_internal' AND tablename = 'bau_weekly_uploads') THEN
        CREATE POLICY write_uploads_internal ON bau_weekly_uploads
        FOR ALL USING ( is_internal() ) WITH CHECK ( is_internal() );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write_aliases_internal' AND tablename = 'bau_customer_aliases') THEN
        CREATE POLICY write_aliases_internal ON bau_customer_aliases
        FOR ALL USING ( is_internal() ) WITH CHECK ( is_internal() );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'write_catalog_internal' AND tablename = 'bau_metric_catalog') THEN
        CREATE POLICY write_catalog_internal ON bau_metric_catalog
        FOR ALL USING ( is_internal() ) WITH CHECK ( is_internal() );
    END IF;
END $$;

-- VIEWS (Trends & Aggregates)
-- Latest review per customer
CREATE OR REPLACE VIEW v_bau_latest_review AS
SELECT DISTINCT ON (r.bau_customer_id)
  r.bau_customer_id, r.date_from, r.date_to, r.health, r.escalation, r.reviewed_by, r.reviewed_at
FROM bau_weekly_reviews r
ORDER BY r.bau_customer_id, r.date_to DESC;

-- Metric trend (per customer, per metric, over time)
CREATE OR REPLACE VIEW v_bau_metric_trend AS
SELECT
  m.bau_customer_id,
  m.metric_key,
  m.date_from,
  m.date_to,
  m.metric_value_numeric,
  m.metric_value_text
FROM bau_weekly_metrics m
ORDER BY m.bau_customer_id, m.metric_key, m.date_to;

-- Aggregates (sum/avg) per customer, per metric over a date range
CREATE OR REPLACE VIEW v_bau_metric_agg AS
SELECT
  m.bau_customer_id,
  m.metric_key,
  count(*) AS points,
  avg(m.metric_value_numeric) AS avg_value,
  sum(m.metric_value_numeric) AS sum_value,
  min(m.date_from) AS first_from,
  max(m.date_to) AS last_to
FROM bau_weekly_metrics m
GROUP BY m.bau_customer_id, m.metric_key;

-- RPCs
-- Upsert a BAU customer alias (for ingestion mapping)
CREATE OR REPLACE FUNCTION upsert_bau_alias(p_alias text, p_bau_customer_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO bau_customer_aliases(alias, bau_customer_id)
  VALUES (p_alias, p_bau_customer_id)
  ON CONFLICT (alias) DO UPDATE SET bau_customer_id = EXCLUDED.bau_customer_id;
$$;

-- Find BAU customer by alias or exact name; returns id
CREATE OR REPLACE FUNCTION find_bau_customer_id(p_customer_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_id uuid;
BEGIN
  -- Exact by bau_customers.name
  SELECT id INTO v_id FROM bau_customers WHERE lower(name) = lower(p_customer_name) LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Alias table
  SELECT bau_customer_id INTO v_id FROM bau_customer_aliases WHERE lower(alias) = lower(p_customer_name) LIMIT 1;
  RETURN v_id;
END;
$$;

-- Upsert one metric row (used by Edge Function or UI)
CREATE OR REPLACE FUNCTION upsert_bau_weekly_metric(
  p_bau_customer_id uuid,
  p_date_from date,
  p_date_to date,
  p_metric_key text,
  p_metric_value_numeric numeric,
  p_metric_value_text text,
  p_source_upload_id uuid
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO bau_weekly_metrics(bau_customer_id, date_from, date_to, metric_key, metric_value_numeric, metric_value_text, source_upload_id, created_by)
  VALUES (p_bau_customer_id, p_date_from, p_date_to, p_metric_key, p_metric_value_numeric, p_metric_value_text, p_source_upload_id, auth.uid())
  ON CONFLICT (bau_customer_id, date_from, date_to, metric_key)
  DO UPDATE SET
    metric_value_numeric = EXCLUDED.metric_value_numeric,
    metric_value_text    = EXCLUDED.metric_value_text,
    source_upload_id     = COALESCE(EXCLUDED.source_upload_id, bau_weekly_metrics.source_upload_id),
    created_by           = auth.uid(),
    created_at           = now();
$$;

-- Set or update weekly review outcome (health + escalation)
CREATE OR REPLACE FUNCTION set_bau_weekly_review(
  p_bau_customer_id uuid,
  p_date_from date,
  p_date_to date,
  p_health bau_health_simple,
  p_escalation text
) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO bau_weekly_reviews(bau_customer_id, date_from, date_to, health, escalation, reviewed_by)
  VALUES (p_bau_customer_id, p_date_from, p_date_to, p_health, p_escalation, auth.uid())
  ON CONFLICT (bau_customer_id, date_from, date_to)
  DO UPDATE SET health = EXCLUDED.health,
                escalation = EXCLUDED.escalation,
                reviewed_by = auth.uid(),
                reviewed_at = now();
$$;

-- STORAGE BUCKET
-- Create bucket for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('bau-weekly-uploads', 'bau-weekly-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: internal users can upload/read  
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_bau_weekly_read' AND schemaname = 'storage' AND tablename = 'objects') THEN
        CREATE POLICY storage_bau_weekly_read
        ON storage.objects FOR SELECT
        USING ( bucket_id = 'bau-weekly-uploads' AND is_internal() );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_bau_weekly_write' AND schemaname = 'storage' AND tablename = 'objects') THEN
        CREATE POLICY storage_bau_weekly_write
        ON storage.objects FOR INSERT
        WITH CHECK ( bucket_id = 'bau-weekly-uploads' AND is_internal() );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'storage_bau_weekly_update' AND schemaname = 'storage' AND tablename = 'objects') THEN
        CREATE POLICY storage_bau_weekly_update
        ON storage.objects FOR UPDATE
        USING ( bucket_id = 'bau-weekly-uploads' AND is_internal() );
    END IF;
END $$;