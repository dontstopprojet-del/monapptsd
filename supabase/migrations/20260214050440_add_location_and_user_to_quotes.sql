/*
  # Add Location and User Fields to Quote Requests

  1. Changes
    - Add `user_id` column to link quotes to authenticated users
    - Add `location_coordinates` column to store GPS coordinates and address
    - Add index on user_id for better query performance
    
  2. Security
    - Update RLS policies to allow authenticated users to view their own quotes
*/

-- Add user_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Add location_coordinates column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'location_coordinates'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN location_coordinates jsonb;
  END IF;
END $$;

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS idx_quote_requests_user_id ON quote_requests(user_id);

-- Update RLS policies to allow authenticated users to view their own quotes
DROP POLICY IF EXISTS "Authenticated users can view their own quotes" ON quote_requests;
CREATE POLICY "Authenticated users can view their own quotes"
  ON quote_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Update policy to allow authenticated users to insert their own quotes
DROP POLICY IF EXISTS "Authenticated users can insert their own quotes" ON quote_requests;
CREATE POLICY "Authenticated users can insert their own quotes"
  ON quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Update policy to allow authenticated users to update their own quotes
DROP POLICY IF EXISTS "Authenticated users can update their own quotes" ON quote_requests;
CREATE POLICY "Authenticated users can update their own quotes"
  ON quote_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
