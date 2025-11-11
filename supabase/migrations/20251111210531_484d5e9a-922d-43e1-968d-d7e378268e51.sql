-- Step 1: Remove NOT NULL constraint from line_id
-- This allows positions to belong to either lines OR solutions_lines (but not both)
ALTER TABLE positions 
  ALTER COLUMN line_id DROP NOT NULL;

-- The check constraint 'positions_line_type_check' already ensures exactly one is populated