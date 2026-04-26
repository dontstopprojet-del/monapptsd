/*
  # Restrict public-files SELECT policy

  1. Changes
    - Remove broad SELECT policy that lets any authenticated user list all files
    - Replace with owner-scoped policy: authenticated users can only list files they uploaded
    - Public bucket already serves files by direct URL without needing a SELECT policy

  2. Security
    - Prevents authenticated users from enumerating all files in the bucket
    - File access via public URL remains unaffected (public bucket)
*/

DROP POLICY IF EXISTS "Authenticated users can read public-files" ON storage.objects;

CREATE POLICY "Users can read own public-files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'public-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
