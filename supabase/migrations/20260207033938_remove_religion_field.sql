/*
  # Remove religion field from app_users

  1. Changes
    - Remove `religion` column from app_users table
    - Remove `app_users_religion_check` constraint

  2. Reason
    - User request to remove religious affiliation tracking
    - This field is no longer needed for the application

  3. Notes
    - This is a safe removal as the field was optional
    - No data loss concerns as this information is no longer required
*/

-- Remove the religion check constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_users_religion_check'
  ) THEN
    ALTER TABLE app_users DROP CONSTRAINT app_users_religion_check;
  END IF;
END $$;

-- Remove the religion column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'religion'
  ) THEN
    ALTER TABLE app_users DROP COLUMN religion;
  END IF;
END $$;
