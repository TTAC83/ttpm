-- Invoice status enum
CREATE TYPE public.invoice_status_enum AS ENUM ('not_raised', 'raised', 'received');

-- Per-project hardware invoice status (implementation projects)
CREATE TABLE public.project_hardware_invoice_status (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  hardware_master_id uuid NOT NULL REFERENCES public.hardware_master(id) ON DELETE CASCADE,
  invoice_status public.invoice_status_enum NOT NULL DEFAULT 'not_raised',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_hardware_invoice_status_pkey PRIMARY KEY (project_id, hardware_master_id)
);

ALTER TABLE public.project_hardware_invoice_status ENABLE ROW LEVEL SECURITY;

-- Internal users: full access
CREATE POLICY project_hardware_invoice_status_internal_all
ON public.project_hardware_invoice_status
FOR ALL
USING (is_internal())
WITH CHECK (is_internal());

-- External users: access limited to projects in their company
CREATE POLICY project_hardware_invoice_status_company_access
ON public.project_hardware_invoice_status
FOR ALL
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    WHERE p.company_id = user_company_id()
  )
)
WITH CHECK (
  project_id IN (
    SELECT p.id FROM public.projects p
    WHERE p.company_id = user_company_id()
  )
);

-- Per-project hardware invoice status (solutions projects)
CREATE TABLE public.solutions_project_hardware_invoice_status (
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  hardware_master_id uuid NOT NULL REFERENCES public.hardware_master(id) ON DELETE CASCADE,
  invoice_status public.invoice_status_enum NOT NULL DEFAULT 'not_raised',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT solutions_project_hardware_invoice_status_pkey PRIMARY KEY (solutions_project_id, hardware_master_id)
);

ALTER TABLE public.solutions_project_hardware_invoice_status ENABLE ROW LEVEL SECURITY;

-- Internal users: full access for solutions projects
CREATE POLICY solutions_project_hardware_invoice_status_internal_all
ON public.solutions_project_hardware_invoice_status
FOR ALL
USING (is_internal())
WITH CHECK (is_internal());

-- External users: access limited to solutions projects in their company
CREATE POLICY solutions_project_hardware_invoice_status_company_access
ON public.solutions_project_hardware_invoice_status
FOR ALL
USING (
  solutions_project_id IN (
    SELECT sp.id FROM public.solutions_projects sp
    WHERE sp.company_id = user_company_id()
  )
)
WITH CHECK (
  solutions_project_id IN (
    SELECT sp.id FROM public.solutions_projects sp
    WHERE sp.company_id = user_company_id()
  )
);