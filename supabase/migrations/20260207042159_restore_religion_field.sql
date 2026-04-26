/*
  # Restore religion field

  1. Changes
    - Add `religion` (text) - Confession religieuse (Musulman(e)/Chrétien(ne), facultatif)
    - Add constraint for religion values to ensure data integrity

  2. Security
    - Maintain existing RLS policies
    - Field is optional and accessible only to admin and the employee themselves

  3. Notes
    - This field is used for internal organization purposes
    - Field is completely optional
*/

-- Add religion column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'religion'
  ) THEN
    ALTER TABLE app_users ADD COLUMN religion text;
  END IF;
END $$;

-- Add constraint for religion values (optional field)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_users_religion_check'
  ) THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_religion_check
      CHECK (religion IS NULL OR religion IN ('Musulman(e)', 'Chrétien(ne)'));
  END IF;
END $$;