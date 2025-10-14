-- =====================================================
-- PHASE 1: Create Unified Hardware Master Table
-- =====================================================

-- Create hardware master table with unified schema
CREATE TABLE public.hardware_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core identification fields (from Excel schema)
  hardware_type TEXT NOT NULL,
  sku_no TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  product_name TEXT NOT NULL,
  
  -- Details and pricing
  description TEXT,
  price_gbp NUMERIC(10,2),
  
  -- Deployment requirements
  minimum_quantity INTEGER DEFAULT 1,
  required_optional TEXT,
  tags TEXT,
  comments TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraint for valid hardware types
  CONSTRAINT hardware_type_check CHECK (hardware_type IN (
    'Server', 'Camera', 'Light', 'PLC', 'PLC Expansion', 'Storage', 
    'VPN', 'TV Device', 'HMI', '10G SFP ADDON', 'Processing Server', 
    'Load Balancer', 'Gateway', 'IoT Device', 'IoT Receiver', 'CTs', 'Cloud'
  ))
);

-- Create indexes for efficient filtering
CREATE INDEX idx_hardware_master_type ON public.hardware_master(hardware_type);
CREATE INDEX idx_hardware_master_sku ON public.hardware_master(sku_no);
CREATE INDEX idx_hardware_master_tags ON public.hardware_master USING gin(to_tsvector('english', COALESCE(tags, '')));

-- Enable RLS
ALTER TABLE public.hardware_master ENABLE ROW LEVEL SECURITY;

-- Internal users can manage all hardware
CREATE POLICY hardware_master_internal_all ON public.hardware_master
  FOR ALL
  USING (is_internal())
  WITH CHECK (is_internal());

-- External users can read for selection purposes
CREATE POLICY hardware_master_external_read ON public.hardware_master
  FOR SELECT
  USING (true);

-- =====================================================
-- PHASE 2: Create Hardware Requirements Junction Table
-- =====================================================

-- Junction table linking projects/BAU/solutions to hardware
CREATE TABLE public.project_hardware_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys to parent entities
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  bau_customer_id UUID REFERENCES public.bau_customers(id) ON DELETE CASCADE,
  solutions_project_id UUID REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  
  -- Hardware reference
  hardware_master_id UUID NOT NULL REFERENCES public.hardware_master(id) ON DELETE CASCADE,
  
  -- Requirement details
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Ensure only one parent reference is set
  CONSTRAINT only_one_parent_reference CHECK (
    (project_id IS NOT NULL)::int + 
    (bau_customer_id IS NOT NULL)::int + 
    (solutions_project_id IS NOT NULL)::int = 1
  ),
  
  -- Prevent duplicate hardware for same parent
  CONSTRAINT unique_project_hardware UNIQUE NULLS NOT DISTINCT (project_id, hardware_master_id),
  CONSTRAINT unique_bau_hardware UNIQUE NULLS NOT DISTINCT (bau_customer_id, hardware_master_id),
  CONSTRAINT unique_solutions_hardware UNIQUE NULLS NOT DISTINCT (solutions_project_id, hardware_master_id)
);

-- Create indexes for efficient lookups
CREATE INDEX idx_project_hardware_project ON public.project_hardware_requirements(project_id) WHERE project_id IS NOT NULL;
CREATE INDEX idx_project_hardware_bau ON public.project_hardware_requirements(bau_customer_id) WHERE bau_customer_id IS NOT NULL;
CREATE INDEX idx_project_hardware_solutions ON public.project_hardware_requirements(solutions_project_id) WHERE solutions_project_id IS NOT NULL;
CREATE INDEX idx_project_hardware_master ON public.project_hardware_requirements(hardware_master_id);

-- Enable RLS
ALTER TABLE public.project_hardware_requirements ENABLE ROW LEVEL SECURITY;

-- Internal users can manage all requirements
CREATE POLICY hardware_requirements_internal_all ON public.project_hardware_requirements
  FOR ALL
  USING (is_internal())
  WITH CHECK (is_internal());

-- External users can view their company's requirements (project/BAU based only, solutions don't have company_id)
CREATE POLICY hardware_requirements_external_select ON public.project_hardware_requirements
  FOR SELECT
  USING (
    (project_id IN (
      SELECT pr.id FROM projects pr WHERE pr.company_id = user_company_id()
    ))
    OR
    (bau_customer_id IN (
      SELECT bc.id FROM bau_customers bc WHERE bc.company_id = user_company_id()
    ))
    OR
    solutions_project_id IS NOT NULL  -- Solutions projects are accessible to all
  );

-- External project members can insert/update/delete requirements
CREATE POLICY hardware_requirements_external_modify ON public.project_hardware_requirements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_hardware_requirements.project_id
      AND pm.user_id = auth.uid()
    )
    OR
    (bau_customer_id IN (
      SELECT bc.id FROM bau_customers bc WHERE bc.company_id = user_company_id()
    ))
    OR
    solutions_project_id IS NOT NULL  -- Solutions projects can be modified by internal users
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_hardware_requirements.project_id
      AND pm.user_id = auth.uid()
    )
    OR
    (bau_customer_id IN (
      SELECT bc.id FROM bau_customers bc WHERE bc.company_id = user_company_id()
    ))
    OR
    solutions_project_id IS NOT NULL
  );

-- =====================================================
-- PHASE 3: Create trigger for updated_at
-- =====================================================

CREATE TRIGGER hardware_master_updated_at
  BEFORE UPDATE ON public.hardware_master
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER hardware_requirements_updated_at
  BEFORE UPDATE ON public.project_hardware_requirements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();