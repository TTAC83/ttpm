-- Add FK columns to vision_models table for proper relational integrity
-- Follows parallel columns approach: new FK columns alongside existing text columns

-- Add line FK columns (dual approach like positions table)
ALTER TABLE public.vision_models
ADD COLUMN line_id UUID REFERENCES public.lines(id) ON DELETE SET NULL,
ADD COLUMN solutions_line_id UUID REFERENCES public.solutions_lines(id) ON DELETE SET NULL;

-- Add position FK
ALTER TABLE public.vision_models
ADD COLUMN position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL;

-- Add equipment FK
ALTER TABLE public.vision_models
ADD COLUMN equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL;

-- Add camera FK (direct link to camera config)
ALTER TABLE public.vision_models
ADD COLUMN camera_id UUID REFERENCES public.cameras(id) ON DELETE SET NULL;

-- Constraint: at most one of line_id/solutions_line_id populated (both null allowed for legacy)
ALTER TABLE public.vision_models
ADD CONSTRAINT vision_models_line_type_check 
CHECK (NOT (line_id IS NOT NULL AND solutions_line_id IS NOT NULL));

-- Create indexes for FK columns for query performance
CREATE INDEX idx_vision_models_line_id ON public.vision_models(line_id) WHERE line_id IS NOT NULL;
CREATE INDEX idx_vision_models_solutions_line_id ON public.vision_models(solutions_line_id) WHERE solutions_line_id IS NOT NULL;
CREATE INDEX idx_vision_models_position_id ON public.vision_models(position_id) WHERE position_id IS NOT NULL;
CREATE INDEX idx_vision_models_equipment_id ON public.vision_models(equipment_id) WHERE equipment_id IS NOT NULL;
CREATE INDEX idx_vision_models_camera_id ON public.vision_models(camera_id) WHERE camera_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN public.vision_models.line_id IS 'FK to implementation lines - use this OR solutions_line_id, not both';
COMMENT ON COLUMN public.vision_models.solutions_line_id IS 'FK to solutions lines - use this OR line_id, not both';
COMMENT ON COLUMN public.vision_models.position_id IS 'FK to positions table';
COMMENT ON COLUMN public.vision_models.equipment_id IS 'FK to equipment table';
COMMENT ON COLUMN public.vision_models.camera_id IS 'FK to cameras table - direct link to camera configuration';
COMMENT ON COLUMN public.vision_models.line_name IS 'LEGACY: Text-based line name. New records should use line_id/solutions_line_id instead';
COMMENT ON COLUMN public.vision_models.position IS 'LEGACY: Text-based position. New records should use position_id instead';
COMMENT ON COLUMN public.vision_models.equipment IS 'LEGACY: Text-based equipment. New records should use equipment_id instead';