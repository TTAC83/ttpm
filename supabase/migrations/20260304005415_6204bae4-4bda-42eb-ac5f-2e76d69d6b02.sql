-- Make avatars bucket private (defense-in-depth)
UPDATE storage.buckets SET public = false WHERE id = 'avatars';
