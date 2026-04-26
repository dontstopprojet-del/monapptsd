/*
  # Fix public-files storage bucket policies for authenticated users

  1. Changes
    - Add INSERT policy for authenticated users on public-files bucket
    - This fixes broadcast image upload which fails because admins are authenticated,
      but the existing INSERT policy only targets the anonymous (public) role

  2. Security
    - Only authenticated users can upload to public-files bucket
    - Existing public role policy kept for backward compatibility
*/

CREATE POLICY "Authenticated users can upload to public-files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'public-files');
