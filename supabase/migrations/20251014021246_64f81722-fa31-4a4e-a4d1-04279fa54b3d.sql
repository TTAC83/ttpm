-- Drop the incorrectly named table (my new one conflicts with existing)
DROP TABLE IF EXISTS public.project_hardware_requirements CASCADE;

-- Create new table with a different name for IoT-specific requirements
CREATE TABLE IF NOT EXISTS public.project_iot_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  solutions_project_id UUID REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  bau_customer_id UUID REFERENCES public.bau_customers(id) ON DELETE CASCADE,
  hardware_type TEXT NOT NULL CHECK (hardware_type IN ('gateway', 'receiver', 'device')),
  gateway_id UUID REFERENCES public.gateways_master(id),
  receiver_id UUID REFERENCES public.receivers_master(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_iot_project_reference CHECK (
    (project_id IS NOT NULL AND solutions_project_id IS NULL AND bau_customer_id IS NULL) OR
    (project_id IS NULL AND solutions_project_id IS NOT NULL AND bau_customer_id IS NULL) OR
    (project_id IS NULL AND solutions_project_id IS NULL AND bau_customer_id IS NOT NULL)
  )
);

-- Enable RLS
ALTER TABLE public.project_iot_requirements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "iot_req_internal_all"
  ON public.project_iot_requirements
  FOR ALL
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "iot_req_external_select"
  ON public.project_iot_requirements
  FOR SELECT
  USING (
    (project_id IN (
      SELECT pr.id FROM projects pr WHERE pr.company_id = user_company_id()
    )) OR
    (solutions_project_id IS NOT NULL) OR
    (bau_customer_id IN (
      SELECT bc.id FROM bau_customers bc WHERE bc.company_id = user_company_id()
    ))
  );

CREATE POLICY "iot_req_external_insert"
  ON public.project_iot_requirements
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_iot_requirements.project_id
      AND pm.user_id = auth.uid()
    ) OR
    (solutions_project_id IS NOT NULL) OR
    EXISTS (
      SELECT 1 FROM bau_customers bc
      WHERE bc.id = project_iot_requirements.bau_customer_id
      AND bc.company_id = user_company_id()
    )
  );

CREATE POLICY "iot_req_external_update"
  ON public.project_iot_requirements
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_iot_requirements.project_id
      AND pm.user_id = auth.uid()
    ) OR
    (solutions_project_id IS NOT NULL) OR
    EXISTS (
      SELECT 1 FROM bau_customers bc
      WHERE bc.id = project_iot_requirements.bau_customer_id
      AND bc.company_id = user_company_id()
    )
  );

CREATE POLICY "iot_req_external_delete"
  ON public.project_iot_requirements
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_iot_requirements.project_id
      AND pm.user_id = auth.uid()
    ) OR
    (solutions_project_id IS NOT NULL) OR
    EXISTS (
      SELECT 1 FROM bau_customers bc
      WHERE bc.id = project_iot_requirements.bau_customer_id
      AND bc.company_id = user_company_id()
    )
  );