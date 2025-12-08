-- Add footage_assigned_to column for assigning who captures footage
ALTER TABLE public.vision_models
ADD COLUMN footage_assigned_to uuid REFERENCES public.profiles(user_id);

-- Add index for faster lookups
CREATE INDEX idx_vision_models_footage_assigned_to ON public.vision_models(footage_assigned_to);

-- Add comment
COMMENT ON COLUMN public.vision_models.footage_assigned_to IS 'User assigned to capture footage at the Footage Required stage';