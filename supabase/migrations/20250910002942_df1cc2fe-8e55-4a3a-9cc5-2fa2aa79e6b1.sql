-- Create events table for project calendar
CREATE TABLE public.project_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create event attendees table
CREATE TABLE public.event_attendees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL,
  user_id UUID NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Enable RLS
ALTER TABLE public.project_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_events
CREATE POLICY "events_external_select" 
ON public.project_events 
FOR SELECT 
USING (project_id IN ( 
  SELECT pr.id
  FROM projects pr
  WHERE pr.company_id = ( 
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
));

CREATE POLICY "events_external_insert" 
ON public.project_events 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1
  FROM project_members pm
  WHERE pm.project_id = project_events.project_id 
  AND pm.user_id = auth.uid()
));

CREATE POLICY "events_external_update" 
ON public.project_events 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM project_members pm
  WHERE pm.project_id = project_events.project_id 
  AND pm.user_id = auth.uid()
));

CREATE POLICY "events_external_delete" 
ON public.project_events 
FOR DELETE 
USING (created_by = auth.uid() OR EXISTS ( 
  SELECT 1
  FROM project_members pm
  WHERE pm.project_id = project_events.project_id 
  AND pm.user_id = auth.uid()
));

CREATE POLICY "events_internal_all" 
ON public.project_events 
FOR ALL 
USING (EXISTS ( 
  SELECT 1
  FROM profiles p
  WHERE p.user_id = auth.uid() 
  AND p.is_internal = true
));

-- RLS policies for event_attendees
CREATE POLICY "attendees_external_select" 
ON public.event_attendees 
FOR SELECT 
USING (event_id IN ( 
  SELECT pe.id
  FROM project_events pe
  JOIN projects pr ON pr.id = pe.project_id
  WHERE pr.company_id = ( 
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
));

CREATE POLICY "attendees_external_insert" 
ON public.event_attendees 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1
  FROM project_events pe
  JOIN project_members pm ON pm.project_id = pe.project_id
  WHERE pe.id = event_attendees.event_id 
  AND pm.user_id = auth.uid()
));

CREATE POLICY "attendees_external_update" 
ON public.event_attendees 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM project_events pe
  JOIN project_members pm ON pm.project_id = pe.project_id
  WHERE pe.id = event_attendees.event_id 
  AND pm.user_id = auth.uid()
));

CREATE POLICY "attendees_external_delete" 
ON public.event_attendees 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM project_events pe
  JOIN project_members pm ON pm.project_id = pe.project_id
  WHERE pe.id = event_attendees.event_id 
  AND pm.user_id = auth.uid()
));

CREATE POLICY "attendees_internal_all" 
ON public.event_attendees 
FOR ALL 
USING (EXISTS ( 
  SELECT 1
  FROM profiles p
  WHERE p.user_id = auth.uid() 
  AND p.is_internal = true
));

-- Add updated_at trigger for project_events
CREATE TRIGGER update_project_events_updated_at
BEFORE UPDATE ON public.project_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();