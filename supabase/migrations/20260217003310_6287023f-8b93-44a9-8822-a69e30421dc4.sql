
-- Create camera-to-server assignment join table
CREATE TABLE public.camera_server_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  camera_id uuid NOT NULL REFERENCES public.cameras(id) ON DELETE CASCADE,
  server_requirement_id uuid NOT NULL REFERENCES public.project_iot_requirements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT camera_server_assignments_camera_id_key UNIQUE (camera_id)
);

-- Enable RLS
ALTER TABLE public.camera_server_assignments ENABLE ROW LEVEL SECURITY;

-- RLS policies - mirror project_iot_requirements access (authenticated users)
CREATE POLICY "Authenticated users can view camera server assignments"
  ON public.camera_server_assignments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert camera server assignments"
  ON public.camera_server_assignments FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update camera server assignments"
  ON public.camera_server_assignments FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete camera server assignments"
  ON public.camera_server_assignments FOR DELETE
  USING (auth.role() = 'authenticated');

-- Index for fast lookups by server
CREATE INDEX idx_camera_server_assignments_server ON public.camera_server_assignments(server_requirement_id);
