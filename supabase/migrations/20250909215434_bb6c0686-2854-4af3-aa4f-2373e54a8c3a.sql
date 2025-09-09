-- Add INSERT policy for companies table to allow internal users to create new companies
CREATE POLICY "companies_internal_insert" 
ON public.companies 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true
  )
);