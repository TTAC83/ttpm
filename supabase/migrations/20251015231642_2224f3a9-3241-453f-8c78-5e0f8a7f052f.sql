-- Update solutions_projects table to use company_id instead of company_name
-- This makes it consistent with the projects table

-- First, drop the dependent view
DROP VIEW IF EXISTS v_all_projects_for_selection CASCADE;

-- Add company_id column
ALTER TABLE solutions_projects 
ADD COLUMN company_id UUID;

-- Migrate existing data: find/create companies and set company_id
DO $$
DECLARE
  rec RECORD;
  v_company_id UUID;
BEGIN
  FOR rec IN SELECT id, company_name FROM solutions_projects WHERE company_name IS NOT NULL
  LOOP
    -- Try to find existing company
    SELECT id INTO v_company_id 
    FROM companies 
    WHERE LOWER(name) = LOWER(rec.company_name) 
    LIMIT 1;
    
    -- If not found, create it
    IF v_company_id IS NULL THEN
      INSERT INTO companies (name, is_internal)
      VALUES (rec.company_name, false)
      RETURNING id INTO v_company_id;
    END IF;
    
    -- Update the solutions_project
    UPDATE solutions_projects 
    SET company_id = v_company_id 
    WHERE id = rec.id;
  END LOOP;
END $$;

-- Add foreign key constraint
ALTER TABLE solutions_projects
ADD CONSTRAINT solutions_projects_company_id_fkey 
FOREIGN KEY (company_id) 
REFERENCES companies(id);

-- Make company_id NOT NULL after migration
ALTER TABLE solutions_projects 
ALTER COLUMN company_id SET NOT NULL;

-- Drop old company_name column
ALTER TABLE solutions_projects 
DROP COLUMN company_name;

-- Rename customer_project_lead to customer_lead for consistency
ALTER TABLE solutions_projects
RENAME COLUMN customer_project_lead TO customer_lead;

-- Recreate the view with the new schema
CREATE OR REPLACE VIEW v_all_projects_for_selection AS
SELECT 
  sp.id,
  c.name as company_name,
  sp.site_name,
  sp.domain,
  'solutions' as project_type
FROM solutions_projects sp
JOIN companies c ON c.id = sp.company_id

UNION ALL

SELECT 
  p.id,
  c.name as company_name,
  p.site_name,
  p.domain,
  'implementation' as project_type
FROM projects p
JOIN companies c ON c.id = p.company_id;