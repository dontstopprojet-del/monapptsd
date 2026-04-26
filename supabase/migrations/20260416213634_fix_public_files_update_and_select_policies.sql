/*
  # Fix public-files storage policies for broadcast uploads

  1. Changes
    - Add UPDATE policy for authenticated users on public-files bucket
      (needed because upload uses upsert: true)
    - Replace restrictive SELECT policy with one that allows authenticated
      users to read all files in public-files bucket
      (broadcast images are stored in broadcasts/ folder, not user-id folder)

  2. Security
    - Only authenticated users can update and read files in public-files bucket
    - Public bucket already allows anonymous read via public URL
*/

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
    AND policyname = 'Users can list own public files'
  ) THEN
    DROP POLICY "Users can list own public files" ON storage.objects;
  END IF;
END $$;

CREATE POLICY "Authenticated users can read public-files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'public-files');

CREATE POLICY "Authenticated users can update public-files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'public-files')
  WITH CHECK (bucket_id = 'public-files');

CREATE POLICY "Authenticated users can delete public-files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'public-files');
