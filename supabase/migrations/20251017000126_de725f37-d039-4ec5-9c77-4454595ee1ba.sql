-- Fix RLS to expose IoT devices and cameras for Solutions Lines

-- Ensure RLS enabled on iot_devices (idempotent)
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;

-- Create internal-all policy for iot_devices if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'iot_devices' AND policyname = 'iot_devices_internal_all'
  ) THEN
    CREATE POLICY "iot_devices_internal_all"
    ON public.iot_devices
    FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true));
  END IF;
END$$;

-- Allow SELECT via Solutions Lines for iot_devices (company scope)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'iot_devices' AND policyname = 'iot_devices_external_select_solutions'
  ) THEN
    CREATE POLICY "iot_devices_external_select_solutions"
    ON public.iot_devices
    FOR SELECT
    USING (
      equipment_id IN (
        SELECT e.id
        FROM public.equipment e
        JOIN public.solutions_lines sl ON sl.id = e.solutions_line_id
        JOIN public.solutions_projects sp ON sp.id = sl.solutions_project_id
        WHERE sp.company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
      )
    );
  END IF;
END$$;

-- Cameras: Add complementary policy for Solutions Lines
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cameras' AND policyname = 'cameras_external_select_solutions'
  ) THEN
    CREATE POLICY "cameras_external_select_solutions"
    ON public.cameras
    FOR SELECT
    USING (
      equipment_id IN (
        SELECT e.id
        FROM public.equipment e
        JOIN public.solutions_lines sl ON sl.id = e.solutions_line_id
        JOIN public.solutions_projects sp ON sp.id = sl.solutions_project_id
        WHERE sp.company_id = (SELECT p.company_id FROM public.profiles p WHERE p.user_id = auth.uid())
      )
    );
  END IF;
END$$;
