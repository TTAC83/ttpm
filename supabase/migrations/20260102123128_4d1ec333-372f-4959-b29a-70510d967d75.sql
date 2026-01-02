-- Master table for contact roles (editable in Master Data section)
CREATE TABLE public.contact_roles_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Contacts table with JSONB for emails
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  company text,
  notes text,
  emails jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Junction table: contact to roles (with FK for integrity)
CREATE TABLE public.contact_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.contact_roles_master(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, role_id)
);

-- Junction table: contact to implementation projects
CREATE TABLE public.contact_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, project_id)
);

-- Junction table: contact to solutions projects
CREATE TABLE public.contact_solutions_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contact_id, solutions_project_id)
);

-- Indexes for fast lookups
CREATE INDEX idx_contact_projects_project ON public.contact_projects(project_id);
CREATE INDEX idx_contact_projects_contact ON public.contact_projects(contact_id);
CREATE INDEX idx_contact_solutions_projects_project ON public.contact_solutions_projects(solutions_project_id);
CREATE INDEX idx_contact_solutions_projects_contact ON public.contact_solutions_projects(contact_id);
CREATE INDEX idx_contact_role_assignments_contact ON public.contact_role_assignments(contact_id);
CREATE INDEX idx_contact_role_assignments_role ON public.contact_role_assignments(role_id);
CREATE INDEX idx_contacts_emails ON public.contacts USING GIN(emails);

-- Enable RLS
ALTER TABLE public.contact_roles_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_solutions_projects ENABLE ROW LEVEL SECURITY;

-- RLS: contact_roles_master (internal can modify, everyone can read)
CREATE POLICY "contact_roles_master_select" ON public.contact_roles_master
  FOR SELECT USING (true);

CREATE POLICY "contact_roles_master_modify" ON public.contact_roles_master
  FOR ALL USING (is_internal());

-- RLS: contacts (internal all, external via project membership)
CREATE POLICY "contacts_internal_all" ON public.contacts
  FOR ALL USING (is_internal());

CREATE POLICY "contacts_external_select" ON public.contacts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contact_projects cp
      JOIN projects p ON p.id = cp.project_id
      WHERE cp.contact_id = contacts.id AND p.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM contact_solutions_projects csp
      JOIN solutions_projects sp ON sp.id = csp.solutions_project_id
      WHERE csp.contact_id = contacts.id AND sp.company_id = user_company_id()
    )
  );

-- RLS: contact_role_assignments
CREATE POLICY "contact_role_assignments_internal_all" ON public.contact_role_assignments
  FOR ALL USING (is_internal());

CREATE POLICY "contact_role_assignments_external_select" ON public.contact_role_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM contacts c
      JOIN contact_projects cp ON cp.contact_id = c.id
      JOIN projects p ON p.id = cp.project_id
      WHERE c.id = contact_role_assignments.contact_id AND p.company_id = user_company_id()
    )
    OR EXISTS (
      SELECT 1 FROM contacts c
      JOIN contact_solutions_projects csp ON csp.contact_id = c.id
      JOIN solutions_projects sp ON sp.id = csp.solutions_project_id
      WHERE c.id = contact_role_assignments.contact_id AND sp.company_id = user_company_id()
    )
  );

-- RLS: contact_projects
CREATE POLICY "contact_projects_internal_all" ON public.contact_projects
  FOR ALL USING (is_internal());

CREATE POLICY "contact_projects_external_select" ON public.contact_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = contact_projects.project_id AND p.company_id = user_company_id()
    )
  );

-- RLS: contact_solutions_projects
CREATE POLICY "contact_solutions_projects_internal_all" ON public.contact_solutions_projects
  FOR ALL USING (is_internal());

CREATE POLICY "contact_solutions_projects_external_select" ON public.contact_solutions_projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = contact_solutions_projects.solutions_project_id AND sp.company_id = user_company_id()
    )
  );

-- Trigger for updated_at on contacts
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contact_roles_master_updated_at
  BEFORE UPDATE ON public.contact_roles_master
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed some common roles
INSERT INTO public.contact_roles_master (name, description) VALUES
  ('Project Manager', 'Manages project timeline and resources'),
  ('Technical Lead', 'Technical decision maker'),
  ('Operations Manager', 'Manages day-to-day operations'),
  ('Executive Sponsor', 'Senior leadership stakeholder'),
  ('IT Contact', 'IT department representative'),
  ('Line Manager', 'Production line manager');