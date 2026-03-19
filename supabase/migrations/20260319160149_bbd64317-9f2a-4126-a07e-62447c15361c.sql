
-- Create a public storage bucket for product artwork images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-artwork', 'product-artwork', true);

-- Allow anyone to view product artwork (public bucket)
CREATE POLICY "Product artwork is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-artwork');

-- Authenticated users can upload product artwork
CREATE POLICY "Authenticated users can upload product artwork"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-artwork');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update product artwork"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-artwork');

-- Authenticated users can delete product artwork
CREATE POLICY "Authenticated users can delete product artwork"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-artwork');
