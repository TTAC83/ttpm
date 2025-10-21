-- Phase 1: Add polymorphic support for shared features across Implementation and Solutions projects
-- This allows Actions, Calendar, Vision Models, Audit, Feature Requirements, and Escalations to work with both project types

-- Step 1: Create project_type enum
CREATE TYPE project_type AS ENUM ('implementation', 'solutions');

-- Step 2: Update actions table for polymorphic support
ALTER TABLE actions 
  ADD COLUMN project_type project_type DEFAULT 'implementation',
  ADD COLUMN solutions_project_id UUID REFERENCES solutions_projects(id) ON DELETE CASCADE;

-- Add constraint to ensure either project_id OR solutions_project_id is set (not both, not neither)
ALTER TABLE actions 
  ADD CONSTRAINT actions_project_check 
  CHECK (
    (project_id IS NOT NULL AND solutions_project_id IS NULL) OR 
    (project_id IS NULL AND solutions_project_id IS NOT NULL)
  );

-- Step 3: Update project_events table for polymorphic support
ALTER TABLE project_events 
  ADD COLUMN project_type project_type DEFAULT 'implementation',
  ADD COLUMN solutions_project_id UUID REFERENCES solutions_projects(id) ON DELETE CASCADE;

ALTER TABLE project_events 
  ADD CONSTRAINT events_project_check 
  CHECK (
    (project_id IS NOT NULL AND solutions_project_id IS NULL) OR 
    (project_id IS NULL AND solutions_project_id IS NOT NULL)
  );

-- Step 4: Update vision_models table for polymorphic support
ALTER TABLE vision_models 
  ADD COLUMN project_type project_type DEFAULT 'implementation',
  ADD COLUMN solutions_project_id UUID REFERENCES solutions_projects(id) ON DELETE CASCADE;

ALTER TABLE vision_models 
  ADD CONSTRAINT vision_models_project_check 
  CHECK (
    (project_id IS NOT NULL AND solutions_project_id IS NULL) OR 
    (project_id IS NULL AND solutions_project_id IS NOT NULL)
  );

-- Step 5: Update product_gaps table for polymorphic support
ALTER TABLE product_gaps 
  ADD COLUMN project_type project_type DEFAULT 'implementation',
  ADD COLUMN solutions_project_id UUID REFERENCES solutions_projects(id) ON DELETE CASCADE;

ALTER TABLE product_gaps 
  ADD CONSTRAINT product_gaps_project_check 
  CHECK (
    (project_id IS NOT NULL AND solutions_project_id IS NULL) OR 
    (project_id IS NULL AND solutions_project_id IS NOT NULL)
  );

-- Step 6: Update implementation_blockers table for polymorphic support
ALTER TABLE implementation_blockers 
  ADD COLUMN project_type project_type DEFAULT 'implementation',
  ADD COLUMN solutions_project_id UUID REFERENCES solutions_projects(id) ON DELETE CASCADE;

ALTER TABLE implementation_blockers 
  ADD CONSTRAINT blockers_project_check 
  CHECK (
    (project_id IS NOT NULL AND solutions_project_id IS NULL) OR 
    (project_id IS NULL AND solutions_project_id IS NOT NULL)
  );

-- Step 7: Create indexes for performance on new columns
CREATE INDEX idx_actions_solutions_project_id ON actions(solutions_project_id) WHERE solutions_project_id IS NOT NULL;
CREATE INDEX idx_actions_project_type ON actions(project_type);

CREATE INDEX idx_project_events_solutions_project_id ON project_events(solutions_project_id) WHERE solutions_project_id IS NOT NULL;
CREATE INDEX idx_project_events_project_type ON project_events(project_type);

CREATE INDEX idx_vision_models_solutions_project_id ON vision_models(solutions_project_id) WHERE solutions_project_id IS NOT NULL;
CREATE INDEX idx_vision_models_project_type ON vision_models(project_type);

CREATE INDEX idx_product_gaps_solutions_project_id ON product_gaps(solutions_project_id) WHERE solutions_project_id IS NOT NULL;
CREATE INDEX idx_product_gaps_project_type ON product_gaps(project_type);

CREATE INDEX idx_implementation_blockers_solutions_project_id ON implementation_blockers(solutions_project_id) WHERE solutions_project_id IS NOT NULL;
CREATE INDEX idx_implementation_blockers_project_type ON implementation_blockers(project_type);

-- Step 8: Add RLS policies for solutions projects access
-- Actions - Solutions projects
CREATE POLICY "actions_solutions_external_select"
ON actions
FOR SELECT
USING (
  solutions_project_id IN (
    SELECT sp.id 
    FROM solutions_projects sp
    WHERE sp.company_id = user_company_id()
  )
);

CREATE POLICY "actions_solutions_internal_all"
ON actions
FOR ALL
USING (
  solutions_project_id IS NOT NULL AND is_internal()
);

-- Project Events - Solutions projects
CREATE POLICY "events_solutions_external_select"
ON project_events
FOR SELECT
USING (
  solutions_project_id IN (
    SELECT sp.id 
    FROM solutions_projects sp
    WHERE sp.company_id = user_company_id()
  )
);

CREATE POLICY "events_solutions_internal_all"
ON project_events
FOR ALL
USING (
  solutions_project_id IS NOT NULL AND is_internal()
);

-- Vision Models - Solutions projects  
CREATE POLICY "vision_models_solutions_external_select"
ON vision_models
FOR SELECT
USING (
  solutions_project_id IN (
    SELECT sp.id 
    FROM solutions_projects sp
    WHERE sp.company_id = user_company_id()
  )
);

CREATE POLICY "vision_models_solutions_internal_all"
ON vision_models
FOR ALL
USING (
  solutions_project_id IS NOT NULL AND is_internal()
);

-- Product Gaps - Solutions projects
CREATE POLICY "product_gaps_solutions_external_select"
ON product_gaps
FOR SELECT
USING (
  solutions_project_id IN (
    SELECT sp.id 
    FROM solutions_projects sp
    WHERE sp.company_id = user_company_id()
  )
);

CREATE POLICY "product_gaps_solutions_internal_all"
ON product_gaps
FOR ALL
USING (
  solutions_project_id IS NOT NULL AND is_internal()
);

-- Implementation Blockers - Solutions projects
CREATE POLICY "blockers_solutions_external_select"
ON implementation_blockers
FOR SELECT
USING (
  solutions_project_id IN (
    SELECT sp.id 
    FROM solutions_projects sp
    WHERE sp.company_id = user_company_id()
  )
);

CREATE POLICY "blockers_solutions_internal_all"
ON implementation_blockers
FOR ALL
USING (
  solutions_project_id IS NOT NULL AND is_internal()
);