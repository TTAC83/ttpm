-- Create a function to get pending invitations (invitations where user hasn't registered yet)
CREATE OR REPLACE FUNCTION get_pending_invitations()
RETURNS TABLE (
  id uuid,
  email text,
  invited_at timestamp with time zone,
  expires_at timestamp with time zone,
  invited_by uuid,
  inviter_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    i.id,
    i.email,
    i.invited_at,
    i.expires_at,
    i.invited_by,
    COALESCE(p.name, 'Admin') as inviter_name
  FROM invitations i
  LEFT JOIN profiles p ON p.user_id = i.invited_by
  WHERE i.accepted_at IS NULL 
    AND i.expires_at > now()
    AND NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.email = i.email
    );
$$;