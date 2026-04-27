-- Enums
DO $$ BEGIN CREATE TYPE public.gospa_status AS ENUM ('not_started','in_progress','blocked','done'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gospa_rag AS ENUM ('red','amber','green'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gospa_metric_freq AS ENUM ('weekly','monthly','quarterly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gospa_metric_trend AS ENUM ('up','flat','down'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gospa_severity AS ENUM ('low','medium','high','critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.gospa_blocker_link AS ENUM ('objective','plan','action'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpers
CREATE OR REPLACE FUNCTION public.gospa_can_write()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(),'internal_admin'::app_role) OR public.has_role(auth.uid(),'gospa_admin'::app_role); $$;

CREATE OR REPLACE FUNCTION public.gospa_can_read()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_internal(); $$;

-- Tables
CREATE TABLE public.gospa_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  owner UUID,
  timeframe_start DATE,
  timeframe_end DATE,
  status public.gospa_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);

CREATE TABLE public.gospa_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES public.gospa_goals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner UUID,
  rag_status public.gospa_rag NOT NULL DEFAULT 'green',
  target_outcome TEXT,
  order_index INT NOT NULL DEFAULT 1 CHECK (order_index BETWEEN 1 AND 6),
  strategic_direction TEXT,
  ai_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);
CREATE INDEX gospa_objectives_goal_idx ON public.gospa_objectives(goal_id);

CREATE TABLE public.gospa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.gospa_objectives(id) ON DELETE CASCADE,
  order_index INT NOT NULL CHECK (order_index BETWEEN 1 AND 6),
  question_text TEXT NOT NULL,
  answer_text TEXT,
  evidence TEXT,
  risks TEXT,
  opportunities TEXT,
  confidence_score INT DEFAULT 0 CHECK (confidence_score BETWEEN 0 AND 100),
  owner UUID,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (objective_id, order_index)
);
CREATE INDEX gospa_questions_obj_idx ON public.gospa_questions(objective_id);

CREATE TABLE public.gospa_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.gospa_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner UUID,
  status public.gospa_status NOT NULL DEFAULT 'not_started',
  rag_status public.gospa_rag NOT NULL DEFAULT 'green',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);
CREATE INDEX gospa_strategies_obj_idx ON public.gospa_strategies(objective_id);

CREATE TABLE public.gospa_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  strategy_id UUID NOT NULL REFERENCES public.gospa_strategies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  owner UUID,
  start_date DATE,
  end_date DATE,
  status public.gospa_status NOT NULL DEFAULT 'not_started',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);
CREATE INDEX gospa_plans_strategy_idx ON public.gospa_plans(strategy_id);

CREATE TABLE public.gospa_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.gospa_objectives(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  owner UUID,
  target_value NUMERIC,
  current_value NUMERIC,
  unit TEXT,
  frequency public.gospa_metric_freq NOT NULL DEFAULT 'weekly',
  trend public.gospa_metric_trend NOT NULL DEFAULT 'flat',
  data_source TEXT,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);
CREATE INDEX gospa_metrics_obj_idx ON public.gospa_metrics(objective_id);

CREATE TABLE public.gospa_metric_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_id UUID NOT NULL REFERENCES public.gospa_metrics(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID DEFAULT auth.uid()
);
CREATE INDEX gospa_metric_history_metric_idx ON public.gospa_metric_history(metric_id, recorded_at DESC);

CREATE TABLE public.gospa_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.gospa_objectives(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  decision_owner UUID,
  decision_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);
CREATE INDEX gospa_decisions_obj_idx ON public.gospa_decisions(objective_id);

CREATE TABLE public.gospa_blockers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linked_type public.gospa_blocker_link NOT NULL,
  linked_id UUID NOT NULL,
  description TEXT NOT NULL,
  severity public.gospa_severity NOT NULL DEFAULT 'medium',
  owner UUID,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID DEFAULT auth.uid()
);
CREATE INDEX gospa_blockers_link_idx ON public.gospa_blockers(linked_type, linked_id);

CREATE TABLE public.gospa_weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL UNIQUE,
  summary_md TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by UUID DEFAULT auth.uid()
);

-- Extend project_tasks
ALTER TABLE public.project_tasks
  ADD COLUMN IF NOT EXISTS gospa_plan_id UUID REFERENCES public.gospa_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gospa_objective_id UUID REFERENCES public.gospa_objectives(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gospa_strategy_id UUID REFERENCES public.gospa_strategies(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS gospa_flag BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS project_tasks_gospa_plan_idx ON public.project_tasks(gospa_plan_id);
CREATE INDEX IF NOT EXISTS project_tasks_gospa_objective_idx ON public.project_tasks(gospa_objective_id);

-- Validation trigger for tasks
CREATE OR REPLACE FUNCTION public.gospa_validate_task()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.gospa_flag = true AND NEW.gospa_plan_id IS NULL THEN
    RAISE EXCEPTION 'GOSPA-flagged tasks must reference a plan (gospa_plan_id)';
  END IF;

  IF NEW.gospa_plan_id IS NOT NULL THEN
    SELECT s.id, s.objective_id
      INTO NEW.gospa_strategy_id, NEW.gospa_objective_id
    FROM public.gospa_plans p
    JOIN public.gospa_strategies s ON s.id = p.strategy_id
    WHERE p.id = NEW.gospa_plan_id;
  END IF;

  IF NEW.project_id IS NULL AND NEW.solutions_project_id IS NULL AND NEW.gospa_plan_id IS NULL THEN
    RAISE EXCEPTION 'Task must belong to a project, a solutions project, or a GOSPA plan';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gospa_validate_task_trg ON public.project_tasks;
CREATE TRIGGER gospa_validate_task_trg
BEFORE INSERT OR UPDATE ON public.project_tasks
FOR EACH ROW EXECUTE FUNCTION public.gospa_validate_task();

-- updated_at triggers
CREATE TRIGGER gospa_goals_set_updated_at BEFORE UPDATE ON public.gospa_goals FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();
CREATE TRIGGER gospa_objectives_set_updated_at BEFORE UPDATE ON public.gospa_objectives FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();
CREATE TRIGGER gospa_strategies_set_updated_at BEFORE UPDATE ON public.gospa_strategies FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();
CREATE TRIGGER gospa_plans_set_updated_at BEFORE UPDATE ON public.gospa_plans FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();
CREATE TRIGGER gospa_blockers_set_updated_at BEFORE UPDATE ON public.gospa_blockers FOR EACH ROW EXECUTE FUNCTION public.set_timestamp_updated_at();

-- Auto-seed 6 standard questions on objective insert
CREATE OR REPLACE FUNCTION public.gospa_seed_questions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  qs TEXT[] := ARRAY[
    'Where are we now? (current state, baseline, evidence)',
    'Where do we want to be? (desired outcome, success measures)',
    'Why does this matter? (impact, business case, urgency)',
    'What''s stopping us? (risks, blockers, dependencies)',
    'What do we need to learn? (open questions, assumptions to test)',
    'How will we win? (advantage, differentiators, key levers)'
  ];
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    INSERT INTO public.gospa_questions(objective_id, order_index, question_text)
    VALUES (NEW.id, i, qs[i]);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS gospa_seed_questions_trg ON public.gospa_objectives;
CREATE TRIGGER gospa_seed_questions_trg
AFTER INSERT ON public.gospa_objectives
FOR EACH ROW EXECUTE FUNCTION public.gospa_seed_questions();

-- Enable RLS
ALTER TABLE public.gospa_goals          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_objectives     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_questions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_strategies     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_plans          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_metrics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_metric_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_decisions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_blockers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gospa_weekly_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "gospa_goals_read"   ON public.gospa_goals FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_goals_insert" ON public.gospa_goals FOR INSERT TO authenticated WITH CHECK (public.gospa_can_write());
CREATE POLICY "gospa_goals_update" ON public.gospa_goals FOR UPDATE TO authenticated USING (public.gospa_can_write() OR owner = auth.uid()) WITH CHECK (public.gospa_can_write() OR owner = auth.uid());
CREATE POLICY "gospa_goals_delete" ON public.gospa_goals FOR DELETE TO authenticated USING (public.gospa_can_write());

CREATE POLICY "gospa_objectives_read"   ON public.gospa_objectives FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_objectives_insert" ON public.gospa_objectives FOR INSERT TO authenticated WITH CHECK (public.gospa_can_write());
CREATE POLICY "gospa_objectives_update" ON public.gospa_objectives FOR UPDATE TO authenticated USING (public.gospa_can_write() OR owner = auth.uid()) WITH CHECK (public.gospa_can_write() OR owner = auth.uid());
CREATE POLICY "gospa_objectives_delete" ON public.gospa_objectives FOR DELETE TO authenticated USING (public.gospa_can_write());

CREATE POLICY "gospa_questions_read"   ON public.gospa_questions FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_questions_insert" ON public.gospa_questions FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_questions_update" ON public.gospa_questions FOR UPDATE TO authenticated USING (public.gospa_can_read()) WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_questions_delete" ON public.gospa_questions FOR DELETE TO authenticated USING (public.gospa_can_write());

CREATE POLICY "gospa_strategies_read"   ON public.gospa_strategies FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_strategies_insert" ON public.gospa_strategies FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_strategies_update" ON public.gospa_strategies FOR UPDATE TO authenticated USING (public.gospa_can_write() OR owner = auth.uid()) WITH CHECK (public.gospa_can_write() OR owner = auth.uid());
CREATE POLICY "gospa_strategies_delete" ON public.gospa_strategies FOR DELETE TO authenticated USING (public.gospa_can_write() OR owner = auth.uid());

CREATE POLICY "gospa_plans_read"   ON public.gospa_plans FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_plans_insert" ON public.gospa_plans FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_plans_update" ON public.gospa_plans FOR UPDATE TO authenticated USING (public.gospa_can_read()) WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_plans_delete" ON public.gospa_plans FOR DELETE TO authenticated USING (public.gospa_can_write() OR owner = auth.uid());

CREATE POLICY "gospa_metrics_read"   ON public.gospa_metrics FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_metrics_insert" ON public.gospa_metrics FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_metrics_update" ON public.gospa_metrics FOR UPDATE TO authenticated USING (public.gospa_can_read()) WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_metrics_delete" ON public.gospa_metrics FOR DELETE TO authenticated USING (public.gospa_can_write() OR owner = auth.uid());

CREATE POLICY "gospa_metric_history_read"   ON public.gospa_metric_history FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_metric_history_insert" ON public.gospa_metric_history FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_metric_history_delete" ON public.gospa_metric_history FOR DELETE TO authenticated USING (public.gospa_can_write());

CREATE POLICY "gospa_decisions_read"   ON public.gospa_decisions FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_decisions_insert" ON public.gospa_decisions FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_decisions_update" ON public.gospa_decisions FOR UPDATE TO authenticated USING (public.gospa_can_read()) WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_decisions_delete" ON public.gospa_decisions FOR DELETE TO authenticated USING (public.gospa_can_write());

CREATE POLICY "gospa_blockers_read"   ON public.gospa_blockers FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_blockers_insert" ON public.gospa_blockers FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_blockers_update" ON public.gospa_blockers FOR UPDATE TO authenticated USING (public.gospa_can_read()) WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_blockers_delete" ON public.gospa_blockers FOR DELETE TO authenticated USING (public.gospa_can_write() OR owner = auth.uid());

CREATE POLICY "gospa_weekly_reviews_read"   ON public.gospa_weekly_reviews FOR SELECT TO authenticated USING (public.gospa_can_read());
CREATE POLICY "gospa_weekly_reviews_insert" ON public.gospa_weekly_reviews FOR INSERT TO authenticated WITH CHECK (public.gospa_can_read());
CREATE POLICY "gospa_weekly_reviews_update" ON public.gospa_weekly_reviews FOR UPDATE TO authenticated USING (public.gospa_can_write()) WITH CHECK (public.gospa_can_write());
CREATE POLICY "gospa_weekly_reviews_delete" ON public.gospa_weekly_reviews FOR DELETE TO authenticated USING (public.gospa_can_write());