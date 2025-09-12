-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Internal users can manage solutions project servers" ON public.solutions_project_servers;
DROP POLICY IF EXISTS "Internal users can manage solutions project gateways" ON public.solutions_project_gateways;
DROP POLICY IF EXISTS "Internal users can manage solutions project receivers" ON public.solutions_project_receivers;
DROP POLICY IF EXISTS "Internal users can manage solutions project TV displays" ON public.solutions_project_tv_displays;

-- Link tables for hardware selections per Solutions Project

-- Servers selections
CREATE TABLE IF NOT EXISTS public.solutions_project_servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  server_master_id uuid NOT NULL REFERENCES public.servers_master(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sps_project ON public.solutions_project_servers(solutions_project_id);

ALTER TABLE public.solutions_project_servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage solutions project servers"
ON public.solutions_project_servers
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true));

-- Gateways selections
CREATE TABLE IF NOT EXISTS public.solutions_project_gateways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  gateway_master_id uuid NOT NULL REFERENCES public.gateways_master(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spg_project ON public.solutions_project_gateways(solutions_project_id);

ALTER TABLE public.solutions_project_gateways ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage solutions project gateways"
ON public.solutions_project_gateways
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true));

-- Receivers selections
CREATE TABLE IF NOT EXISTS public.solutions_project_receivers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  receiver_master_id uuid NOT NULL REFERENCES public.receivers_master(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spr_project ON public.solutions_project_receivers(solutions_project_id);

ALTER TABLE public.solutions_project_receivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage solutions project receivers"
ON public.solutions_project_receivers
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true));

-- TV Displays selections
CREATE TABLE IF NOT EXISTS public.solutions_project_tv_displays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solutions_project_id uuid NOT NULL REFERENCES public.solutions_projects(id) ON DELETE CASCADE,
  tv_display_master_id uuid NOT NULL REFERENCES public.tv_displays_master(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sptv_project ON public.solutions_project_tv_displays(solutions_project_id);

ALTER TABLE public.solutions_project_tv_displays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal users can manage solutions project TV displays"
ON public.solutions_project_tv_displays
FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true))
WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true));

-- Add triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sps_updated_at') THEN
        CREATE TRIGGER update_sps_updated_at
        BEFORE UPDATE ON public.solutions_project_servers
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_spg_updated_at') THEN
        CREATE TRIGGER update_spg_updated_at
        BEFORE UPDATE ON public.solutions_project_gateways
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_spr_updated_at') THEN
        CREATE TRIGGER update_spr_updated_at
        BEFORE UPDATE ON public.solutions_project_receivers
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_sptv_updated_at') THEN
        CREATE TRIGGER update_sptv_updated_at
        BEFORE UPDATE ON public.solutions_project_tv_displays
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;