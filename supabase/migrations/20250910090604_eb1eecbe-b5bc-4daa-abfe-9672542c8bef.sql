-- Create a function to get all users with their profiles and auth data
CREATE OR REPLACE FUNCTION get_all_users_with_profiles()
RETURNS TABLE (
  user_id uuid,
  email text,
  created_at timestamp with time zone,
  last_sign_in_at timestamp with time zone,
  name text,
  job_title text,
  phone text,
  avatar_url text,
  role text,
  is_internal boolean,
  company_id uuid,
  company_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    p.name,
    p.job_title,
    p.phone,
    p.avatar_url,
    p.role,
    COALESCE(p.is_internal, false) as is_internal,
    p.company_id,
    c.name as company_name
  FROM auth.users u
  LEFT JOIN profiles p ON p.user_id = u.id
  LEFT JOIN companies c ON c.id = p.company_id
  ORDER BY u.created_at DESC;
$$;