-- Relax XOR constraint so both can be NULL (standalone), but still not both set.
ALTER TABLE public.project_events
  DROP CONSTRAINT IF EXISTS events_project_check;

ALTER TABLE public.project_events
  DROP CONSTRAINT IF EXISTS project_events_project_xor;

ALTER TABLE public.project_events
  ADD CONSTRAINT project_events_project_xor CHECK (
    NOT (project_id IS NOT NULL AND solutions_project_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS project_events_start_date_idx ON public.project_events(start_date);
CREATE INDEX IF NOT EXISTS event_attendees_user_id_idx ON public.event_attendees(user_id);

-- Replace the broad ALL policy to permit standalone events for internal users only
DROP POLICY IF EXISTS project_events_all ON public.project_events;

CREATE POLICY project_events_all ON public.project_events
FOR ALL
USING (
  (SELECT public.is_internal())
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_events.project_id
          AND p.company_id = (SELECT public.user_company_id())
      ))
  OR (solutions_project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.solutions_projects sp
        WHERE sp.id = project_events.solutions_project_id
          AND sp.company_id = (SELECT public.user_company_id())
      ))
)
WITH CHECK (
  (SELECT public.is_internal())
  OR (project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = project_events.project_id
          AND p.company_id = (SELECT public.user_company_id())
      ))
  OR (solutions_project_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.solutions_projects sp
        WHERE sp.id = project_events.solutions_project_id
          AND sp.company_id = (SELECT public.user_company_id())
      ))
);