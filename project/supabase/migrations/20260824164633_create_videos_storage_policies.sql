/*
# Storage policies for videos bucket

## Overview
Creates RLS policies for the 'videos' storage bucket so authenticated users
can upload, read, and delete their own video files.

## Security
- Users can only access files in their own folder (user_id/file_path)
- Bucket is private (not publicly accessible)
*/

-- Storage policies for videos bucket
DROP POLICY IF EXISTS "Users can upload own videos" ON storage.objects;
CREATE POLICY "Users can upload own videos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can read own videos" ON storage.objects;
CREATE POLICY "Users can read own videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
CREATE POLICY "Users can delete own videos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'videos' AND (storage.foldername(name))[1] = auth.uid()::text);
