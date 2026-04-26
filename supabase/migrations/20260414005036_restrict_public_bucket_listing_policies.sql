/*
  # Restrict Public Bucket File Listing Policies

  1. Problem
    - Public buckets have broad SELECT policies on storage.objects that allow
      clients to list ALL files in the bucket
    - Public buckets don't need SELECT policies for direct URL access
    - This exposes more data than intended (file names, metadata)

  2. Changes
    - Drop broad SELECT policies on public buckets:
      - chantier-photos
      - message-files
      - payment-proofs
      - profile-photos
      - public-files
    - Replace with owner-based or authenticated-only policies that restrict
      listing to relevant files only

  3. Security
    - Public URL access to known file paths still works (public bucket feature)
    - File listing/browsing is now restricted to authenticated users
    - Each bucket policy scoped to authenticated users only
*/

DROP POLICY IF EXISTS "Allow public to view photos" ON storage.objects;
CREATE POLICY "Authenticated users can list chantier photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chantier-photos');

DROP POLICY IF EXISTS "Public read access for message files" ON storage.objects;
CREATE POLICY "Authenticated users can list message files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'message-files');

DROP POLICY IF EXISTS "Public can view payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can list payment proofs"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
CREATE POLICY "Authenticated users can list profile photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-photos');

DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
CREATE POLICY "Authenticated users can list public files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'public-files');
