/*
  # Add image URL to broadcasts

  1. Modified Tables
    - `admin_broadcasts`
      - Added `image_url` (text, nullable) - URL of an image to display with the broadcast

  2. Notes
    - Allows admins to attach an image to their broadcast messages
    - Image is optional (nullable column)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'admin_broadcasts' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE admin_broadcasts ADD COLUMN image_url text;
  END IF;
END $$;
