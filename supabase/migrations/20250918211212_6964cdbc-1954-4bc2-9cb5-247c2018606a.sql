-- Add foreign key constraint from feature_requests.created_by to profiles.user_id
-- This will allow us to join feature_requests with profiles properly

-- First, let's add the foreign key constraint
ALTER TABLE public.feature_requests 
DROP CONSTRAINT IF EXISTS feature_requests_created_by_profiles_fkey;

-- Add proper foreign key to profiles.user_id instead of auth.users.id
ALTER TABLE public.feature_requests 
ADD CONSTRAINT feature_requests_created_by_profiles_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);