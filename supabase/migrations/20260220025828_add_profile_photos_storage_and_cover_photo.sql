/*
  # Add profile photos storage bucket and cover_photo column

  1. New Storage
    - `profile-photos` bucket for profile and cover photos
    - Public read access, 5MB size limit, image MIME types only
    - RLS policies: owners can upload/update/delete their own photos
  
  2. Modified Tables
    - `app_users`: Add `cover_photo` text column for cover photo URL

  3. Security
    - Storage RLS: only authenticated users can upload to their own folder
    - Storage RLS: only file owners can update/delete their files
    - Public read access for displaying photos
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'cover_photo'
  ) THEN
    ALTER TABLE app_users ADD COLUMN cover_photo text;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-photos',
  'profile-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload own profile photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update own profile photos" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own profile photos" ON storage.objects;
  DROP POLICY IF EXISTS "Public can view profile photos" ON storage.objects;
END $$;

CREATE POLICY "Users can upload own profile photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own profile photos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own profile photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Public can view profile photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'profile-photos');
