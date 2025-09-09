-- Create internal admin profile for allan@thingtrax.com
-- First, let's get the Thingtrax company ID
WITH thingtrax_company AS (
  SELECT id FROM companies WHERE name = 'Thingtrax Ltd' LIMIT 1
)
INSERT INTO profiles (user_id, name, company_id, role, is_internal, job_title)
VALUES (
  gen_random_uuid(), -- We'll need to update this with the real user_id after auth signup
  'Allan',
  (SELECT id FROM thingtrax_company),
  'internal_admin',
  true,
  'Implementation Manager'
);