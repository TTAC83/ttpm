-- Step 2: Fix corrupted data - move line_id values to solutions_line_id where appropriate
-- This fixes positions that were incorrectly stored with line_id pointing to solutions_lines

UPDATE positions
SET 
  solutions_line_id = line_id,
  line_id = NULL
WHERE 
  line_id IS NOT NULL 
  AND solutions_line_id IS NULL
  AND line_id IN (SELECT id FROM solutions_lines);

-- Log the fix
DO $$
DECLARE
  affected_count INTEGER;
BEGIN
  GET DIAGNOSTICS affected_count = ROW_COUNT;
  RAISE NOTICE 'Fixed % positions: moved line_id to solutions_line_id', affected_count;
END $$;