-- First drop functions with parameter name conflicts, then recreate them

-- Drop add_working_days (has parameter name conflict)
DROP FUNCTION IF EXISTS public.add_working_days(DATE, INTEGER);

-- Recreate add_working_days with search_path
CREATE FUNCTION public.add_working_days(start_date DATE, working_days INTEGER)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_date DATE := start_date;
  days_added INTEGER := 0;
  direction INTEGER := SIGN(working_days);
BEGIN
  IF working_days = 0 THEN
    RETURN start_date;
  END IF;

  WHILE days_added < ABS(working_days) LOOP
    result_date := result_date + direction;
    IF EXTRACT(DOW FROM result_date) NOT IN (0, 6) THEN
      days_added := days_added + 1;
    END IF;
  END LOOP;

  RETURN result_date;
END;
$$;

-- Fix admin_set_user_role_and_company
DROP FUNCTION IF EXISTS public.admin_set_user_role_and_company(TEXT, TEXT, TEXT);
CREATE FUNCTION public.admin_set_user_role_and_company(
  p_user_email TEXT,
  p_role TEXT,
  p_company_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_company_id UUID;
  v_role app_role;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_user_email;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_user_email;
  END IF;

  v_role := p_role::app_role;

  IF p_company_name IS NOT NULL THEN
    SELECT id INTO v_company_id FROM public.companies WHERE name = p_company_name;
    IF v_company_id IS NULL THEN
      INSERT INTO public.companies (name) VALUES (p_company_name) RETURNING id INTO v_company_id;
    END IF;
    UPDATE public.profiles SET company_id = v_company_id WHERE user_id = v_user_id;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = v_user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, v_role);
END;
$$;

-- Fix copy_wbs_layout_for_project
CREATE OR REPLACE FUNCTION public.copy_wbs_layout_for_project(p_project_id uuid, p_is_solutions boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_is_solutions THEN
    INSERT INTO wbs_rows (solutions_project_id, master_step_id, master_task_id, is_summary, row_order)
    SELECT 
      p_project_id,
      master_step_id,
      master_task_id,
      is_summary,
      row_order
    FROM wbs_rows
    WHERE project_id IS NULL AND solutions_project_id IS NULL;
  ELSE
    INSERT INTO wbs_rows (project_id, master_step_id, master_task_id, is_summary, row_order)
    SELECT 
      p_project_id,
      master_step_id,
      master_task_id,
      is_summary,
      row_order
    FROM wbs_rows
    WHERE project_id IS NULL AND solutions_project_id IS NULL;
  END IF;
END;
$$;

-- Fix projects_after_insert_trigger
CREATE OR REPLACE FUNCTION public.projects_after_insert_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.snapshot_project_tasks(NEW.id);
  PERFORM public.copy_wbs_layout_for_project(NEW.id, false);
  RETURN NEW;
END;
$$;

-- Fix impl_blockers_validate_close
CREATE OR REPLACE FUNCTION public.impl_blockers_validate_close()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Closed' THEN
    IF COALESCE(NEW.resolution_notes, '') = '' THEN
      RAISE EXCEPTION 'Resolution notes are required to close a blocker';
    END IF;
    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Fix product_gaps_validate_close
CREATE OR REPLACE FUNCTION public.product_gaps_validate_close()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'Closed' THEN
    IF COALESCE(NEW.resolution_notes, '') = '' THEN
      RAISE EXCEPTION 'Resolution notes are required to close a product gap';
    END IF;
    IF NEW.closed_at IS NULL THEN
      NEW.closed_at := now();
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Fix ensure_impl_project
CREATE OR REPLACE FUNCTION public.ensure_impl_project()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  d text;
BEGIN
  SELECT p.domain::text INTO d FROM public.projects p WHERE p.id = NEW.project_id;
  IF d IS NULL THEN
    RAISE EXCEPTION 'Invalid project';
  END IF;
  IF d NOT IN ('IoT','Vision','Hybrid') THEN
    RAISE EXCEPTION 'Blockers allowed for Implementation projects only. Domain=%, id=%', d, NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix touch_wbs_updated_at
CREATE OR REPLACE FUNCTION public.touch_wbs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Fix touch_subtask_updated_at
CREATE OR REPLACE FUNCTION public.touch_subtask_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

-- Fix sync_profile_role
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles
    SET role = public.get_user_primary_role(NEW.user_id)
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET role = public.get_user_primary_role(OLD.user_id)
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix solutions_projects_after_insert_trigger  
CREATE OR REPLACE FUNCTION public.solutions_projects_after_insert_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.snapshot_solutions_project_tasks(NEW.id);
  PERFORM public.copy_wbs_layout_for_project(NEW.id, true);
  RETURN NEW;
END;
$$;

-- Fix actions_validate_and_set_project
CREATE OR REPLACE FUNCTION public.actions_validate_and_set_project()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.project_task_id IS NOT NULL THEN
    SELECT pt.project_id, pt.solutions_project_id
    INTO NEW.project_id, NEW.solutions_project_id
    FROM public.project_tasks pt
    WHERE pt.id = NEW.project_task_id;
  END IF;

  IF NEW.project_task_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.project_tasks pt
      WHERE pt.id = NEW.project_task_id
        AND COALESCE(pt.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(NEW.project_id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND COALESCE(pt.solutions_project_id, '00000000-0000-0000-0000-000000000000'::uuid)
            = COALESCE(NEW.solutions_project_id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'Provided project reference does not match project_task_id''s project';
    END IF;
  END IF;

  IF NEW.project_task_id IS NULL AND NEW.project_id IS NULL AND NEW.solutions_project_id IS NULL THEN
    RAISE EXCEPTION 'Either project_task_id, project_id, or solutions_project_id must be provided';
  END IF;

  IF NEW.project_type IS NULL THEN
    IF NEW.project_id IS NOT NULL THEN
      NEW.project_type := 'implementation';
    ELSIF NEW.solutions_project_id IS NOT NULL THEN
      NEW.project_type := 'solutions';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix impl_generate_weeks
CREATE OR REPLACE FUNCTION public.impl_generate_weeks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  start_date DATE := '2025-01-06';
  end_date DATE := '2026-12-31';
  current_start DATE;
BEGIN
  current_start := start_date;
  WHILE current_start <= end_date LOOP
    INSERT INTO impl_weekly_weeks(week_start, week_end)
    VALUES (current_start, current_start + interval '6 days')
    ON CONFLICT (week_start) DO NOTHING;
    current_start := current_start + interval '7 days';
  END LOOP;
END;
$$;