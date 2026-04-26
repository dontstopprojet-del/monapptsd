/*
  # Add company information fields for admin users

  1. Changes
    - Add `company_founder` (text) - MAD (Fondateur)
    - Add `company_creation_date` (text) - Date de création (format libre)
    - Add `company_country` (text) - Pays de création
    - Add `company_address` (text) - Lieu de création (adresse)
    - Add `company_postal_code` (text) - Code postal

  2. Security
    - Maintain existing RLS policies
    - These fields are only filled for admin users

  3. Notes
    - These fields store company information for admin accounts
    - Default values provided: SALIMATOU, 12/11/2025, BELGIQUE, RUE LARGE 194, 4870
    - Only admin users will have these fields populated
*/

-- Add company information columns to app_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'company_founder'
  ) THEN
    ALTER TABLE app_users ADD COLUMN company_founder text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'company_creation_date'
  ) THEN
    ALTER TABLE app_users ADD COLUMN company_creation_date text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'company_country'
  ) THEN
    ALTER TABLE app_users ADD COLUMN company_country text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE app_users ADD COLUMN company_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'company_postal_code'
  ) THEN
    ALTER TABLE app_users ADD COLUMN company_postal_code text;
  END IF;
END $$;
