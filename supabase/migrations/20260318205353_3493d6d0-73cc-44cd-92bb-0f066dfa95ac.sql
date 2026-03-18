
-- =========================================================
-- Vision Projects & Products System
-- =========================================================

-- 1. Vision Projects
CREATE TABLE public.vision_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vision_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.vision_projects
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.vision_projects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = vision_projects.solutions_project_id
        AND sp.company_id = user_company_id()
    )
  );

CREATE TRIGGER set_vision_projects_updated_at
  BEFORE UPDATE ON public.vision_projects
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at();

-- 2. Vision Project Attributes (links vision_projects to project_attributes)
CREATE TABLE public.vision_project_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vision_project_id uuid NOT NULL REFERENCES public.vision_projects(id) ON DELETE CASCADE,
  project_attribute_id uuid NOT NULL REFERENCES public.project_attributes(id) ON DELETE CASCADE,
  UNIQUE (vision_project_id, project_attribute_id)
);

ALTER TABLE public.vision_project_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.vision_project_attributes
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.vision_project_attributes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM vision_projects vp
      JOIN solutions_projects sp ON sp.id = vp.solutions_project_id
      WHERE vp.id = vision_project_attributes.vision_project_id
        AND sp.company_id = user_company_id()
    )
  );

-- 3. Products
CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  product_name text NOT NULL,
  master_artwork_url text,
  comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.products
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.products
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM solutions_projects sp
      WHERE sp.id = products.solutions_project_id
        AND sp.company_id = user_company_id()
    )
  );

CREATE TRIGGER set_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at();

-- 4. Product Factory Links (multi-select)
CREATE TABLE public.product_factory_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  factory_id uuid NOT NULL REFERENCES public.solution_factories(id) ON DELETE CASCADE,
  UNIQUE (product_id, factory_id)
);

ALTER TABLE public.product_factory_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.product_factory_links
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.product_factory_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE p.id = product_factory_links.product_id
        AND sp.company_id = user_company_id()
    )
  );

-- 5. Product Group Links (multi-select)
CREATE TABLE public.product_group_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.factory_groups(id) ON DELETE CASCADE,
  UNIQUE (product_id, group_id)
);

ALTER TABLE public.product_group_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.product_group_links
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.product_group_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE p.id = product_group_links.product_id
        AND sp.company_id = user_company_id()
    )
  );

-- 6. Product Line Links (multi-select)
CREATE TABLE public.product_line_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  line_id uuid NOT NULL REFERENCES public.factory_group_lines(id) ON DELETE CASCADE,
  UNIQUE (product_id, line_id)
);

ALTER TABLE public.product_line_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.product_line_links
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.product_line_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE p.id = product_line_links.product_id
        AND sp.company_id = user_company_id()
    )
  );

-- 7. Product Views
CREATE TABLE public.product_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  view_name text NOT NULL,
  view_image_url text,
  vision_project_id uuid REFERENCES public.vision_projects(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.product_views
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.product_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products p
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE p.id = product_views.product_id
        AND sp.company_id = user_company_id()
    )
  );

CREATE TRIGGER set_product_views_updated_at
  BEFORE UPDATE ON public.product_views
  FOR EACH ROW EXECUTE FUNCTION set_timestamp_updated_at();

-- 8. Product View Attributes (attribute values per view)
CREATE TABLE public.product_view_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_view_id uuid NOT NULL REFERENCES public.product_views(id) ON DELETE CASCADE,
  project_attribute_id uuid NOT NULL REFERENCES public.project_attributes(id) ON DELETE CASCADE,
  value text NOT NULL DEFAULT '',
  UNIQUE (product_view_id, project_attribute_id)
);

ALTER TABLE public.product_view_attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.product_view_attributes
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.product_view_attributes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_views pv
      JOIN products p ON p.id = pv.product_id
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE pv.id = product_view_attributes.product_view_id
        AND sp.company_id = user_company_id()
    )
  );

-- 9. Product View Positions
CREATE TABLE public.product_view_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_view_id uuid NOT NULL REFERENCES public.product_views(id) ON DELETE CASCADE,
  position_id uuid NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  UNIQUE (product_view_id, position_id)
);

ALTER TABLE public.product_view_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.product_view_positions
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.product_view_positions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_views pv
      JOIN products p ON p.id = pv.product_id
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE pv.id = product_view_positions.product_view_id
        AND sp.company_id = user_company_id()
    )
  );

-- 10. Product View Equipment
CREATE TABLE public.product_view_equipment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_view_id uuid NOT NULL REFERENCES public.product_views(id) ON DELETE CASCADE,
  equipment_id uuid NOT NULL REFERENCES public.equipment(id) ON DELETE CASCADE,
  UNIQUE (product_view_id, equipment_id)
);

ALTER TABLE public.product_view_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users full access" ON public.product_view_equipment
  FOR ALL TO authenticated
  USING (is_internal())
  WITH CHECK (is_internal());

CREATE POLICY "Company members can view" ON public.product_view_equipment
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM product_views pv
      JOIN products p ON p.id = pv.product_id
      JOIN solutions_projects sp ON sp.id = p.solutions_project_id
      WHERE pv.id = product_view_equipment.product_view_id
        AND sp.company_id = user_company_id()
    )
  );
