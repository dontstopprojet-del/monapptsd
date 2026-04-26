/*
  # Restrict public bucket SELECT policies

  1. Problem
    - Public buckets (chantier-photos, message-files, payment-proofs, profile-photos, public-files)
      have broad SELECT policies allowing any authenticated user to list ALL files
    - Public buckets serve files via direct URL; listing is not needed for normal access
    - Broad listing exposes file names and metadata of all users

  2. Changes
    - Drop all 5 broad SELECT policies on storage.objects
    - Replace with owner-scoped SELECT policies so users can only see their own files
      (needed for delete/update operations that require finding the object first)

  3. Security
    - Users can still access files via public URLs (bucket is public)
    - Users can only list/see metadata for files in their own folder
    - Admin/office users are not granted broad listing either
*/

-- Drop the 5 broad SELECT policies
DROP POLICY IF EXISTS "Authenticated users can list chantier photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list message files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list profile photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can list public files" ON storage.objects;

-- Replace with owner-scoped SELECT policies

CREATE POLICY "Users can list own chantier photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'chantier-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can list own message files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-files'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can list own payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can list own profile photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

CREATE POLICY "Users can list own public files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'public-files'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
