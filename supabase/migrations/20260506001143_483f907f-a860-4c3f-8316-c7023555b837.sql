
-- 1. Remove overly permissive equipment_titles_all policy
DROP POLICY IF EXISTS "equipment_titles_all" ON public.equipment_titles;

-- 2. Remove public read on gospa-images storage bucket
DROP POLICY IF EXISTS "gospa_images_public_read" ON storage.objects;

-- 3. Fix line-media storage policies - restrict to internal users
DROP POLICY IF EXISTS "Authenticated users can upload line media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read line media files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete line media files" ON storage.objects;

CREATE POLICY "Internal users can upload line media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'line-media' AND (SELECT is_internal()));

CREATE POLICY "Internal users can read line media files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'line-media' AND (SELECT is_internal()));

CREATE POLICY "Internal users can delete line media files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'line-media' AND (SELECT is_internal()));

-- 4. Fix product-artwork storage policies - restrict writes to internal users
DROP POLICY IF EXISTS "Authenticated users can upload product artwork" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update product artwork" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete product artwork" ON storage.objects;

CREATE POLICY "Internal users can upload product artwork"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-artwork' AND (SELECT is_internal()));

CREATE POLICY "Internal users can update product artwork"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'product-artwork' AND (SELECT is_internal()));

CREATE POLICY "Internal users can delete product artwork"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'product-artwork' AND (SELECT is_internal()));

-- 5. Fix camera_server_assignments - scope to internal users
DROP POLICY IF EXISTS "Authenticated users can view camera server assignments" ON public.camera_server_assignments;
DROP POLICY IF EXISTS "Authenticated users can insert camera server assignments" ON public.camera_server_assignments;
DROP POLICY IF EXISTS "Authenticated users can update camera server assignments" ON public.camera_server_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete camera server assignments" ON public.camera_server_assignments;

CREATE POLICY "Internal users can view camera server assignments"
ON public.camera_server_assignments FOR SELECT TO authenticated
USING ((SELECT is_internal()));

CREATE POLICY "Internal users can insert camera server assignments"
ON public.camera_server_assignments FOR INSERT TO authenticated
WITH CHECK ((SELECT is_internal()));

CREATE POLICY "Internal users can update camera server assignments"
ON public.camera_server_assignments FOR UPDATE TO authenticated
USING ((SELECT is_internal()));

CREATE POLICY "Internal users can delete camera server assignments"
ON public.camera_server_assignments FOR DELETE TO authenticated
USING ((SELECT is_internal()));

-- 6. Fix device_receiver_assignments - scope to internal users
DROP POLICY IF EXISTS "Authenticated users can view device receiver assignments" ON public.device_receiver_assignments;
DROP POLICY IF EXISTS "Authenticated users can insert device receiver assignments" ON public.device_receiver_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete device receiver assignments" ON public.device_receiver_assignments;

CREATE POLICY "Internal users can view device receiver assignments"
ON public.device_receiver_assignments FOR SELECT TO authenticated
USING ((SELECT is_internal()));

CREATE POLICY "Internal users can insert device receiver assignments"
ON public.device_receiver_assignments FOR INSERT TO authenticated
WITH CHECK ((SELECT is_internal()));

CREATE POLICY "Internal users can delete device receiver assignments"
ON public.device_receiver_assignments FOR DELETE TO authenticated
USING ((SELECT is_internal()));

-- 7. Fix receiver_gateway_assignments - scope to internal users
-- First check if policies exist on this table
DROP POLICY IF EXISTS "Authenticated users can view receiver gateway assignments" ON public.receiver_gateway_assignments;
DROP POLICY IF EXISTS "Authenticated users can insert receiver gateway assignments" ON public.receiver_gateway_assignments;
DROP POLICY IF EXISTS "Authenticated users can update receiver gateway assignments" ON public.receiver_gateway_assignments;
DROP POLICY IF EXISTS "Authenticated users can delete receiver gateway assignments" ON public.receiver_gateway_assignments;

CREATE POLICY "Internal users can view receiver gateway assignments"
ON public.receiver_gateway_assignments FOR SELECT TO authenticated
USING ((SELECT is_internal()));

CREATE POLICY "Internal users can insert receiver gateway assignments"
ON public.receiver_gateway_assignments FOR INSERT TO authenticated
WITH CHECK ((SELECT is_internal()));

CREATE POLICY "Internal users can update receiver gateway assignments"
ON public.receiver_gateway_assignments FOR UPDATE TO authenticated
USING ((SELECT is_internal()));

CREATE POLICY "Internal users can delete receiver gateway assignments"
ON public.receiver_gateway_assignments FOR DELETE TO authenticated
USING ((SELECT is_internal()));
