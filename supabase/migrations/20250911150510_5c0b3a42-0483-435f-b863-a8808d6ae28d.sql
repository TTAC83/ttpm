-- Add titles to positions table
ALTER TABLE public.positions 
ADD COLUMN titles TEXT[] DEFAULT '{}';

-- Create position_titles table for better normalization
CREATE TABLE public.position_titles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (title IN ('RLE', 'OP')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(position_id, title)
);

-- Enable RLS on position_titles
ALTER TABLE public.position_titles ENABLE ROW LEVEL SECURITY;

-- Create policies for position_titles
CREATE POLICY "position_titles_external_select" 
ON public.position_titles 
FOR SELECT 
USING (position_id IN ( 
  SELECT p.id
  FROM positions p
  JOIN lines l ON l.id = p.line_id
  JOIN projects pr ON pr.id = l.project_id
  WHERE pr.company_id = ( 
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
));

CREATE POLICY "position_titles_external_insert" 
ON public.position_titles 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1
  FROM project_members pm
  JOIN lines l ON l.project_id = pm.project_id
  JOIN positions p ON p.line_id = l.id
  WHERE p.id = position_titles.position_id AND pm.user_id = auth.uid()
));

CREATE POLICY "position_titles_external_update" 
ON public.position_titles 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM project_members pm
  JOIN lines l ON l.project_id = pm.project_id
  JOIN positions p ON p.line_id = l.id
  WHERE p.id = position_titles.position_id AND pm.user_id = auth.uid()
));

CREATE POLICY "position_titles_external_delete" 
ON public.position_titles 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM project_members pm
  JOIN lines l ON l.project_id = pm.project_id
  JOIN positions p ON p.line_id = l.id
  WHERE p.id = position_titles.position_id AND pm.user_id = auth.uid()
));

CREATE POLICY "position_titles_internal_all" 
ON public.position_titles 
FOR ALL 
USING (EXISTS ( 
  SELECT 1
  FROM profiles p
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));