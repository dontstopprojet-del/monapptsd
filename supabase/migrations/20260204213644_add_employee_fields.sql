/*
  # Add Employee and Technician Fields

  1. New Columns
    - `contract_number` (text) - Contract number format: TSD-XXXXXXXX (for tech and office roles)
    - `echelon` (text) - Technician rank/level (for tech role only)
    - `status` (text) - Office employee status (for office role only)
    - `password_confirmation` (not stored, just for validation)
  
  2. Changes
    - Add contract_number field for tracking employee contracts
    - Add echelon field for technician qualifications
    - Add status field for office employee positions
  
  3. Security
    - These fields are optional and only required for specific roles
*/

DO $$
BEGIN
  -- Add contract_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'contract_number'
  ) THEN
    ALTER TABLE app_users ADD COLUMN contract_number text;
  END IF;

  -- Add echelon column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'echelon'
  ) THEN
    ALTER TABLE app_users ADD COLUMN echelon text;
  END IF;

  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'status'
  ) THEN
    ALTER TABLE app_users ADD COLUMN status text;
  END IF;
END $$;
