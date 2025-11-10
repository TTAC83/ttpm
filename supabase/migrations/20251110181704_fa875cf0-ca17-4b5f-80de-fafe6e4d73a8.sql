-- Convert product_run_start and product_run_end from date to timestamptz
-- Existing date values will be cast to timestamptz at midnight UTC

ALTER TABLE vision_models 
  ALTER COLUMN product_run_start TYPE timestamptz 
  USING CASE 
    WHEN product_run_start IS NULL THEN NULL 
    ELSE product_run_start::timestamp AT TIME ZONE 'UTC' 
  END;

ALTER TABLE vision_models 
  ALTER COLUMN product_run_end TYPE timestamptz 
  USING CASE 
    WHEN product_run_end IS NULL THEN NULL 
    ELSE product_run_end::timestamp AT TIME ZONE 'UTC' 
  END;