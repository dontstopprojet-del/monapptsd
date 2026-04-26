/*
  # Add sharing capabilities to daily notes

  1. Changes
    - Add `shared_with_admin` column to daily_notes table (boolean, default false)
    - Add `shared_with_client` column to daily_notes table (boolean, default false)
    - Add `client_email` column to daily_notes table (text, optional, for client sharing)
  
  2. Purpose
    - Allow technicians to share their daily notes and photos with admin and clients
    - Track which notes have been shared with whom
    - Store client email for potential notification purposes
*/

-- Add sharing columns to daily_notes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_notes' AND column_name = 'shared_with_admin'
  ) THEN
    ALTER TABLE daily_notes ADD COLUMN shared_with_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_notes' AND column_name = 'shared_with_client'
  ) THEN
    ALTER TABLE daily_notes ADD COLUMN shared_with_client boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_notes' AND column_name = 'client_email'
  ) THEN
    ALTER TABLE daily_notes ADD COLUMN client_email text;
  END IF;
END $$;