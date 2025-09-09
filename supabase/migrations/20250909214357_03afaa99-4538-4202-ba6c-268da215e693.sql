-- Upgrade Allan to internal_admin role
UPDATE profiles 
SET role = 'internal_admin', job_title = 'Implementation Manager'
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'allan@thingtrax.com');