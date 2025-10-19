-- Create vision use cases master data table
CREATE TABLE IF NOT EXISTS public.vision_use_cases_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create camera measurements table (one-to-one with cameras)
CREATE TABLE public.camera_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  horizontal_fov NUMERIC,
  working_distance NUMERIC,
  smallest_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(camera_id)
);

-- Create camera use cases junction table (many-to-many)
CREATE TABLE public.camera_use_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  vision_use_case_id UUID NOT NULL REFERENCES public.vision_use_cases_master(id) ON DELETE CASCADE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(camera_id, vision_use_case_id)
);

-- Create camera attributes table (one-to-many)
CREATE TABLE public.camera_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create camera views table (one-to-one with cameras)
CREATE TABLE public.camera_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id UUID NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  product_flow TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(camera_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.vision_use_cases_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vision_use_cases_master (readable by all authenticated, writable by internal only)
CREATE POLICY "vision_use_cases_master_select" ON public.vision_use_cases_master
  FOR SELECT USING (true);

CREATE POLICY "vision_use_cases_master_internal_all" ON public.vision_use_cases_master
  FOR ALL USING (is_internal());

-- RLS Policies for camera_measurements (same access as cameras table)
CREATE POLICY "camera_measurements_external_select" ON public.camera_measurements
  FOR SELECT USING (
    camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.projects pr ON pr.id = l.project_id
      WHERE pr.company_id = user_company_id()
    ) OR camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.solutions_lines sl ON sl.id = e.solutions_line_id
      JOIN public.solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sp.company_id = user_company_id()
    )
  );

CREATE POLICY "camera_measurements_member_modify" ON public.camera_measurements
  FOR ALL USING (
    is_internal() OR EXISTS (
      SELECT 1 FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.project_members pm ON pm.project_id = l.project_id
      WHERE c.id = camera_measurements.camera_id AND pm.user_id = auth.uid()
    )
  );

-- RLS Policies for camera_use_cases
CREATE POLICY "camera_use_cases_external_select" ON public.camera_use_cases
  FOR SELECT USING (
    camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.projects pr ON pr.id = l.project_id
      WHERE pr.company_id = user_company_id()
    ) OR camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.solutions_lines sl ON sl.id = e.solutions_line_id
      JOIN public.solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sp.company_id = user_company_id()
    )
  );

CREATE POLICY "camera_use_cases_member_modify" ON public.camera_use_cases
  FOR ALL USING (
    is_internal() OR EXISTS (
      SELECT 1 FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.project_members pm ON pm.project_id = l.project_id
      WHERE c.id = camera_use_cases.camera_id AND pm.user_id = auth.uid()
    )
  );

-- RLS Policies for camera_attributes
CREATE POLICY "camera_attributes_external_select" ON public.camera_attributes
  FOR SELECT USING (
    camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.projects pr ON pr.id = l.project_id
      WHERE pr.company_id = user_company_id()
    ) OR camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.solutions_lines sl ON sl.id = e.solutions_line_id
      JOIN public.solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sp.company_id = user_company_id()
    )
  );

CREATE POLICY "camera_attributes_member_modify" ON public.camera_attributes
  FOR ALL USING (
    is_internal() OR EXISTS (
      SELECT 1 FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.project_members pm ON pm.project_id = l.project_id
      WHERE c.id = camera_attributes.camera_id AND pm.user_id = auth.uid()
    )
  );

-- RLS Policies for camera_views
CREATE POLICY "camera_views_external_select" ON public.camera_views
  FOR SELECT USING (
    camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.projects pr ON pr.id = l.project_id
      WHERE pr.company_id = user_company_id()
    ) OR camera_id IN (
      SELECT c.id FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.solutions_lines sl ON sl.id = e.solutions_line_id
      JOIN public.solutions_projects sp ON sp.id = sl.solutions_project_id
      WHERE sp.company_id = user_company_id()
    )
  );

CREATE POLICY "camera_views_member_modify" ON public.camera_views
  FOR ALL USING (
    is_internal() OR EXISTS (
      SELECT 1 FROM public.cameras c
      JOIN public.equipment e ON e.id = c.equipment_id
      JOIN public.lines l ON l.id = e.line_id
      JOIN public.project_members pm ON pm.project_id = l.project_id
      WHERE c.id = camera_views.camera_id AND pm.user_id = auth.uid()
    )
  );

-- Insert some default vision use cases
INSERT INTO public.vision_use_cases_master (name, description) VALUES
  ('Object Detection', 'Detecting and identifying objects in the production line'),
  ('Quality Control', 'Inspecting products for defects and quality issues'),
  ('Measurement', 'Measuring dimensions and properties of products'),
  ('Barcode/QR Reading', 'Reading barcodes, QR codes, and other identification markers'),
  ('OCR (Text Reading)', 'Optical character recognition for reading text and labels'),
  ('Counting', 'Counting products or items on the line'),
  ('Color Verification', 'Verifying product colors match specifications'),
  ('Packaging Inspection', 'Inspecting packaging integrity and correctness')
ON CONFLICT DO NOTHING;