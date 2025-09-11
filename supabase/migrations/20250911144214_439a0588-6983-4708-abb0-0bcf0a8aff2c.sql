-- Add speed fields to lines table
ALTER TABLE public.lines 
ADD COLUMN min_speed numeric,
ADD COLUMN max_speed numeric;

-- Create equipment table for process flow mapping
CREATE TABLE public.equipment (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id uuid NOT NULL,
  name text NOT NULL,
  position_x integer NOT NULL DEFAULT 0,
  position_y integer NOT NULL DEFAULT 0,
  equipment_type text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create equipment titles table (RLE, OP)
CREATE TABLE public.equipment_titles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL,
  title text NOT NULL CHECK (title IN ('RLE', 'OP')),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create cameras table
CREATE TABLE public.cameras (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL,
  camera_type text NOT NULL,
  lens_type text NOT NULL,
  mac_address text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create IoT devices table
CREATE TABLE public.iot_devices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id uuid NOT NULL,
  mac_address text NOT NULL,
  receiver_mac_address text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cameras ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iot_devices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for equipment
CREATE POLICY "equipment_external_select" ON public.equipment
FOR SELECT USING (
  line_id IN (
    SELECT l.id FROM lines l
    JOIN projects pr ON pr.id = l.project_id
    WHERE pr.company_id = (
      SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "equipment_external_insert" ON public.equipment
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    WHERE l.id = equipment.line_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "equipment_external_update" ON public.equipment
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    WHERE l.id = equipment.line_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "equipment_external_delete" ON public.equipment
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    WHERE l.id = equipment.line_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "equipment_internal_all" ON public.equipment
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true)
);

-- Create RLS policies for equipment_titles
CREATE POLICY "equipment_titles_external_select" ON public.equipment_titles
FOR SELECT USING (
  equipment_id IN (
    SELECT e.id FROM equipment e
    JOIN lines l ON l.id = e.line_id
    JOIN projects pr ON pr.id = l.project_id
    WHERE pr.company_id = (
      SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "equipment_titles_external_insert" ON public.equipment_titles
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = equipment_titles.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "equipment_titles_external_update" ON public.equipment_titles
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = equipment_titles.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "equipment_titles_external_delete" ON public.equipment_titles
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = equipment_titles.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "equipment_titles_internal_all" ON public.equipment_titles
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true)
);

-- Create RLS policies for cameras
CREATE POLICY "cameras_external_select" ON public.cameras
FOR SELECT USING (
  equipment_id IN (
    SELECT e.id FROM equipment e
    JOIN lines l ON l.id = e.line_id
    JOIN projects pr ON pr.id = l.project_id
    WHERE pr.company_id = (
      SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "cameras_external_insert" ON public.cameras
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = cameras.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "cameras_external_update" ON public.cameras
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = cameras.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "cameras_external_delete" ON public.cameras
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = cameras.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "cameras_internal_all" ON public.cameras
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true)
);

-- Create RLS policies for iot_devices
CREATE POLICY "iot_devices_external_select" ON public.iot_devices
FOR SELECT USING (
  equipment_id IN (
    SELECT e.id FROM equipment e
    JOIN lines l ON l.id = e.line_id
    JOIN projects pr ON pr.id = l.project_id
    WHERE pr.company_id = (
      SELECT profiles.company_id FROM profiles WHERE profiles.user_id = auth.uid()
    )
  )
);

CREATE POLICY "iot_devices_external_insert" ON public.iot_devices
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = iot_devices.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "iot_devices_external_update" ON public.iot_devices
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = iot_devices.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "iot_devices_external_delete" ON public.iot_devices
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    JOIN lines l ON l.project_id = pm.project_id
    JOIN equipment e ON e.line_id = l.id
    WHERE e.id = iot_devices.equipment_id AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "iot_devices_internal_all" ON public.iot_devices
FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_internal = true)
);

-- Create foreign key constraints
ALTER TABLE public.equipment ADD CONSTRAINT equipment_line_id_fkey FOREIGN KEY (line_id) REFERENCES public.lines(id) ON DELETE CASCADE;
ALTER TABLE public.equipment_titles ADD CONSTRAINT equipment_titles_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;
ALTER TABLE public.cameras ADD CONSTRAINT cameras_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;
ALTER TABLE public.iot_devices ADD CONSTRAINT iot_devices_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id) ON DELETE CASCADE;

-- Create updated_at triggers
CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cameras_updated_at
BEFORE UPDATE ON public.cameras
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_iot_devices_updated_at
BEFORE UPDATE ON public.iot_devices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();