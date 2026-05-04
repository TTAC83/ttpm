
-- Create private storage bucket for GOSPA rich text images
INSERT INTO storage.buckets (id, name, public)
VALUES ('gospa-images', 'gospa-images', true)
ON CONFLICT (id) DO NOTHING;

-- Internal users can upload
CREATE POLICY "gospa_images_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gospa-images'
  AND (SELECT is_internal())
);

-- Internal users can read
CREATE POLICY "gospa_images_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'gospa-images'
  AND (SELECT is_internal())
);

-- Internal users can update
CREATE POLICY "gospa_images_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gospa-images'
  AND (SELECT is_internal())
);

-- Internal users can delete
CREATE POLICY "gospa_images_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gospa-images'
  AND (SELECT is_internal())
);

-- Public read for presentation mode (bucket is public so getPublicUrl works)
CREATE POLICY "gospa_images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'gospa-images');
