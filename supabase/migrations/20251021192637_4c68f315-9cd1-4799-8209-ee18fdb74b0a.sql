-- Create user_roles system to prevent privilege escalation
-- Step 1: Create role enum
CREATE TYPE public.app_role AS ENUM ('internal_admin', 'internal_user', 'customer_admin', 'customer_user');

-- Step 2: Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Step 3: Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Step 5: Create security definer function to get user's roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id;
$$;

-- Step 6: Create RLS policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only internal admins can view all roles
CREATE POLICY "Internal admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'internal_admin'));

-- Only internal admins can insert roles (via edge function)
CREATE POLICY "Internal admins can assign roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'internal_admin'));

-- Only internal admins can delete roles
CREATE POLICY "Internal admins can remove roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'internal_admin'));

-- Step 7: Migrate existing roles from profiles table to user_roles table
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT 
    user_id,
    role::app_role,
    created_at
FROM public.profiles
WHERE role IS NOT NULL
  AND role IN ('internal_admin', 'internal_user', 'customer_admin', 'customer_user')
ON CONFLICT (user_id, role) DO NOTHING;

-- Step 8: Create function to get primary role for backward compatibility
CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::TEXT
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'internal_admin' THEN 1
      WHEN 'customer_admin' THEN 2
      WHEN 'internal_user' THEN 3
      WHEN 'customer_user' THEN 4
    END
  LIMIT 1;
$$;

-- Step 9: Update profiles table to remove direct role storage (keep for backward compatibility initially)
-- DO NOT drop the column yet - we'll keep it for transition period
-- Add a comment to indicate it's deprecated
COMMENT ON COLUMN public.profiles.role IS 'DEPRECATED: Use user_roles table instead. Kept for backward compatibility.';

-- Step 10: Create trigger to keep profiles.role in sync with user_roles for backward compatibility
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.profiles
    SET role = public.get_user_primary_role(NEW.user_id)
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.profiles
    SET role = public.get_user_primary_role(OLD.user_id)
    WHERE user_id = OLD.user_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_profile_role_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role();