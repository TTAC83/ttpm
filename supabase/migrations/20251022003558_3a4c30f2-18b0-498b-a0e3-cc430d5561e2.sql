-- Create enum for hardware status stages
CREATE TYPE hardware_stage_enum AS ENUM (
  'ordered',
  'configured',
  'bench_tested',
  'shipped',
  'installed',
  'validated'
);

-- Create enum for hardware status
CREATE TYPE hardware_status_enum AS ENUM (
  'open',
  'overdue',
  'complete'
);

-- Create hardware status tracking table
CREATE TABLE public.hardware_status_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  hardware_reference TEXT NOT NULL,
  hardware_type TEXT NOT NULL,
  line_name TEXT,
  equipment_name TEXT,
  sku_model TEXT,
  stage hardware_stage_enum NOT NULL,
  status hardware_status_enum NOT NULL DEFAULT 'open',
  start_date DATE,
  complete_date DATE,
  notes TEXT,
  created_by UUID NOT NULL,
  updated_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, hardware_reference, stage)
);

-- Enable RLS
ALTER TABLE public.hardware_status_tracking ENABLE ROW LEVEL SECURITY;

-- Internal users can do everything
CREATE POLICY "hardware_status_internal_all"
ON public.hardware_status_tracking
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.is_internal = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.is_internal = true
  )
);

-- External users can view hardware status for their company's projects
CREATE POLICY "hardware_status_external_select"
ON public.hardware_status_tracking
FOR SELECT
USING (
  project_id IN (
    SELECT pr.id FROM projects pr
    WHERE pr.company_id = (
      SELECT company_id FROM profiles WHERE user_id = auth.uid()
    )
  )
);

-- Project members can insert/update hardware status
CREATE POLICY "hardware_status_member_insert"
ON public.hardware_status_tracking
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = hardware_status_tracking.project_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "hardware_status_member_update"
ON public.hardware_status_tracking
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = hardware_status_tracking.project_id
    AND pm.user_id = auth.uid()
  )
);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_hardware_status_updated_at
BEFORE UPDATE ON public.hardware_status_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();