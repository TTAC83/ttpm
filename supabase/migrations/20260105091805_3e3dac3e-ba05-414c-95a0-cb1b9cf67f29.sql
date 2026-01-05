-- Create attachments storage bucket for blocker file uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policy: Internal users can upload attachments
CREATE POLICY "attachments_internal_insert"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'attachments' 
  AND is_internal()
);

-- RLS policy: Internal users can read all attachments
CREATE POLICY "attachments_internal_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments' 
  AND is_internal()
);

-- RLS policy: Internal users can update their own uploads
CREATE POLICY "attachments_internal_update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'attachments' 
  AND is_internal()
);

-- RLS policy: Internal users can delete attachments
CREATE POLICY "attachments_internal_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'attachments' 
  AND is_internal()
);