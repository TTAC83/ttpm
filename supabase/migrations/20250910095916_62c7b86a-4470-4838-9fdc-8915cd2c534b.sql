-- Create the admin RPC function for updating user role and company
CREATE OR REPLACE FUNCTION public.admin_set_user_role_and_company(
  target_email TEXT,
  new_role TEXT,
  company_name TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
  target_company_id UUID := NULL;
BEGIN
  -- Get the user ID from email
  SELECT id INTO target_user_id 
  FROM auth.users 
  WHERE email = target_email;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', target_email;
  END IF;
  
  -- If company_name is provided, get the company ID
  IF company_name IS NOT NULL THEN
    SELECT id INTO target_company_id 
    FROM public.companies 
    WHERE name = company_name;
    
    IF target_company_id IS NULL THEN
      RAISE EXCEPTION 'Company with name % not found', company_name;
    END IF;
  END IF;
  
  -- Update the user's profile
  UPDATE public.profiles 
  SET 
    role = new_role,
    company_id = target_company_id,
    is_internal = CASE 
      WHEN new_role = 'internal_admin' OR new_role = 'internal_user' THEN true 
      ELSE false 
    END
  WHERE user_id = target_user_id;
  
  -- If no profile exists, create one
  IF NOT FOUND THEN
    INSERT INTO public.profiles (user_id, role, company_id, is_internal)
    VALUES (
      target_user_id, 
      new_role, 
      target_company_id,
      CASE 
        WHEN new_role = 'internal_admin' OR new_role = 'internal_user' THEN true 
        ELSE false 
      END
    );
  END IF;
END;
$$;