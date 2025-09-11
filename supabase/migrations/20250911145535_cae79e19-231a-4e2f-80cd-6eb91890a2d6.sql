-- Create positions table
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  line_id UUID NOT NULL,
  name TEXT NOT NULL,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

-- Create policies for positions
CREATE POLICY "positions_external_select" 
ON public.positions 
FOR SELECT 
USING (line_id IN ( 
  SELECT l.id
  FROM lines l
  JOIN projects pr ON pr.id = l.project_id
  WHERE pr.company_id = ( 
    SELECT profiles.company_id
    FROM profiles
    WHERE profiles.user_id = auth.uid()
  )
));

CREATE POLICY "positions_external_insert" 
ON public.positions 
FOR INSERT 
WITH CHECK (EXISTS ( 
  SELECT 1
  FROM project_members pm
  JOIN lines l ON l.project_id = pm.project_id
  WHERE l.id = positions.line_id AND pm.user_id = auth.uid()
));

CREATE POLICY "positions_external_update" 
ON public.positions 
FOR UPDATE 
USING (EXISTS ( 
  SELECT 1
  FROM project_members pm
  JOIN lines l ON l.project_id = pm.project_id
  WHERE l.id = positions.line_id AND pm.user_id = auth.uid()
));

CREATE POLICY "positions_external_delete" 
ON public.positions 
FOR DELETE 
USING (EXISTS ( 
  SELECT 1
  FROM project_members pm
  JOIN lines l ON l.project_id = pm.project_id
  WHERE l.id = positions.line_id AND pm.user_id = auth.uid()
));

CREATE POLICY "positions_internal_all" 
ON public.positions 
FOR ALL 
USING (EXISTS ( 
  SELECT 1
  FROM profiles p
  WHERE p.user_id = auth.uid() AND p.is_internal = true
));

-- Add position_id to equipment table
ALTER TABLE public.equipment 
ADD COLUMN position_id UUID;

-- Update existing equipment to create default positions
DO $$
DECLARE
  line_record RECORD;
  new_position_id UUID;
BEGIN
  FOR line_record IN SELECT DISTINCT line_id FROM equipment
  LOOP
    -- Create a default position for this line
    INSERT INTO positions (line_id, name, position_x, position_y)
    VALUES (line_record.line_id, 'Default Position', 0, 0)
    RETURNING id INTO new_position_id;
    
    -- Update all equipment in this line to reference the new position
    UPDATE equipment 
    SET position_id = new_position_id 
    WHERE line_id = line_record.line_id;
  END LOOP;
END $$;

-- Make position_id NOT NULL after migration
ALTER TABLE public.equipment 
ALTER COLUMN position_id SET NOT NULL;

-- Create trigger for positions updated_at
CREATE TRIGGER update_positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();