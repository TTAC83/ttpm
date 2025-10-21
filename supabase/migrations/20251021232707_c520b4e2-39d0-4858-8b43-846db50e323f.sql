-- First, drop the existing constraint
ALTER TABLE vision_models 
DROP CONSTRAINT IF EXISTS vision_models_status_check;

-- Update existing rows with old status values to new ones
UPDATE vision_models 
SET status = 'Annotation Required' 
WHERE status = 'Model Training';

UPDATE vision_models 
SET status = 'Validation Required' 
WHERE status = 'Model Validation';

-- Add the new constraint with updated status values
ALTER TABLE vision_models
ADD CONSTRAINT vision_models_status_check 
CHECK (status IN ('Footage Required', 'Annotation Required', 'Processing Required', 'Deployment Required', 'Validation Required', 'Complete'));