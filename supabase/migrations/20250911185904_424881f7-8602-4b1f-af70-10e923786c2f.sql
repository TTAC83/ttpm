-- Add current user as project member for the failing project
INSERT INTO project_members (project_id, user_id, role)
SELECT '2781cfea-b4dc-452b-8967-2be3eea8502d'::uuid, auth.uid(), 'project_lead'
WHERE auth.uid() IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM project_members 
  WHERE project_id = '2781cfea-b4dc-452b-8967-2be3eea8502d'::uuid 
  AND user_id = auth.uid()
);