-- Add boolean flags to track whether times were explicitly entered
ALTER TABLE vision_models 
  ADD COLUMN product_run_start_has_time BOOLEAN DEFAULT false,
  ADD COLUMN product_run_end_has_time BOOLEAN DEFAULT false;

-- Add helpful comments
COMMENT ON COLUMN vision_models.product_run_start_has_time IS 'True if user explicitly entered a time for product_run_start, false if only date was provided';
COMMENT ON COLUMN vision_models.product_run_end_has_time IS 'True if user explicitly entered a time for product_run_end, false if only date was provided';

-- Make the timestamp columns nullable
ALTER TABLE vision_models 
  ALTER COLUMN product_run_start DROP NOT NULL,
  ALTER COLUMN product_run_end DROP NOT NULL;