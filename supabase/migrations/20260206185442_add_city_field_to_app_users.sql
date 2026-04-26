/*
  # Add city field for client accounts

  1. Changes
    - Add `city` column to `app_users` table
    - City is required for client accounts (validated at application level)
    - Used for generating client contract numbers
  
  2. Notes
    - Field is nullable to maintain compatibility with existing accounts
    - Contract format for clients: CTSD-{city_initials}/{dd}/{mm}/{yyyy}MR6
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'city'
  ) THEN
    ALTER TABLE app_users ADD COLUMN city text;
  END IF;
END $$;