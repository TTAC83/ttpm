-- Add solutions_line_id column to positions table
ALTER TABLE public.positions 
ADD COLUMN solutions_line_id UUID REFERENCES public.solutions_lines(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX idx_positions_solutions_line_id ON public.positions(solutions_line_id);

-- Add check constraint to ensure either line_id OR solutions_line_id is set (not both, not neither)
ALTER TABLE public.positions 
ADD CONSTRAINT positions_line_type_check 
CHECK (
  (line_id IS NOT NULL AND solutions_line_id IS NULL) OR
  (line_id IS NULL AND solutions_line_id IS NOT NULL)
);