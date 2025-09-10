-- Set allan@thingtrax.com as internal admin with proper permissions
UPDATE public.profiles 
SET 
  role = 'internal_admin',
  is_internal = true
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'allan@thingtrax.com'
);