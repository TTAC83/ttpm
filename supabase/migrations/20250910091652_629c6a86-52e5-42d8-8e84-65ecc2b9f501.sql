-- Fix remaining security issues by updating RLS policies

-- Restrict invitations table access to only internal admins
DROP POLICY IF EXISTS "invitations_internal_all" ON public.invitations;

CREATE POLICY "invitations_internal_admin_only" 
ON public.invitations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

-- Make reference data tables read-only for most users, write access only for internal admins

-- UK Bank Holidays - read access for internal users, write access for internal admins only
DROP POLICY IF EXISTS "ukbh_internal_rw" ON public.uk_bank_holidays;

CREATE POLICY "ukbh_internal_read" 
ON public.uk_bank_holidays 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true
  )
);

CREATE POLICY "ukbh_internal_admin_write" 
ON public.uk_bank_holidays 
FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

CREATE POLICY "ukbh_internal_admin_update" 
ON public.uk_bank_holidays 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

CREATE POLICY "ukbh_internal_admin_delete" 
ON public.uk_bank_holidays 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

-- Master Steps - read access for internal users, write access for internal admins only
DROP POLICY IF EXISTS "ms_internal_rw" ON public.master_steps;

CREATE POLICY "ms_internal_read" 
ON public.master_steps 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true
  )
);

CREATE POLICY "ms_internal_admin_insert" 
ON public.master_steps 
FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

CREATE POLICY "ms_internal_admin_update" 
ON public.master_steps 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

CREATE POLICY "ms_internal_admin_delete" 
ON public.master_steps 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

-- Master Tasks - read access for internal users, write access for internal admins only  
DROP POLICY IF EXISTS "mt_internal_rw" ON public.master_tasks;

CREATE POLICY "mt_internal_read" 
ON public.master_tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true
  )
);

CREATE POLICY "mt_internal_admin_insert" 
ON public.master_tasks 
FOR INSERT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

CREATE POLICY "mt_internal_admin_update" 
ON public.master_tasks 
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);

CREATE POLICY "mt_internal_admin_delete" 
ON public.master_tasks 
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_internal = true 
    AND p.role = 'internal_admin'
  )
);