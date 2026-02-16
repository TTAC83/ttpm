
-- Portal per solutions project (one-to-one)
CREATE TABLE public.solution_portals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  solutions_project_id UUID NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  url TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT solution_portals_project_unique UNIQUE (solutions_project_id)
);

-- Factories belong to a portal
CREATE TABLE public.solution_factories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portal_id UUID NOT NULL REFERENCES public.solution_portals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shifts belong to a factory (per day of week)
CREATE TABLE public.factory_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.solution_factories(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  shift_name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Groups belong to a factory
CREATE TABLE public.factory_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  factory_id UUID NOT NULL REFERENCES public.solution_factories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lines belong to a group
CREATE TABLE public.factory_group_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.factory_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  solution_type TEXT NOT NULL CHECK (solution_type IN ('vision', 'iot', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_solution_factories_portal ON public.solution_factories(portal_id);
CREATE INDEX idx_factory_shifts_factory ON public.factory_shifts(factory_id);
CREATE INDEX idx_factory_groups_factory ON public.factory_groups(factory_id);
CREATE INDEX idx_factory_group_lines_group ON public.factory_group_lines(group_id);

-- RLS
ALTER TABLE public.solution_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solution_factories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.factory_group_lines ENABLE ROW LEVEL SECURITY;

-- All authenticated users can CRUD (matches existing app pattern)
CREATE POLICY "Authenticated users can manage solution_portals"
  ON public.solution_portals FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage solution_factories"
  ON public.solution_factories FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage factory_shifts"
  ON public.factory_shifts FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage factory_groups"
  ON public.factory_groups FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage factory_group_lines"
  ON public.factory_group_lines FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
