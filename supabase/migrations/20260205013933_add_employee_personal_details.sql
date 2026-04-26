/*
  # Add employee personal details fields

  1. Changes
    - Add `date_of_birth` (date) - Date de naissance
    - Add `contract_signature_date` (date) - Date de signature du contrat
    - Add `religion` (text) - Confession religieuse (Musulman(e)/Chrétien(ne), facultatif)
    - Add `marital_status` (text) - État civil (Célibataire/Marié(e)/Divorcé(e)/Veuf(ve))
    - Add `office_position` (text) - Poste pour employés de bureau (RH/Magasinier/Secrétariat/Assistant/Finance/Comptable/Directeur/Coordinateur)

  2. Security
    - Maintain existing RLS policies
    - Personal data accessible only to admin and the employee themselves

  3. Notes
    - These fields are used for internal organization purposes
    - Birthday and contract anniversary will be shared with admin automatically
    - Religion field is optional for internal event organization
*/

-- Add new columns to app_users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE app_users ADD COLUMN date_of_birth date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'contract_signature_date'
  ) THEN
    ALTER TABLE app_users ADD COLUMN contract_signature_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'religion'
  ) THEN
    ALTER TABLE app_users ADD COLUMN religion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'marital_status'
  ) THEN
    ALTER TABLE app_users ADD COLUMN marital_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'office_position'
  ) THEN
    ALTER TABLE app_users ADD COLUMN office_position text;
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

-- Add constraint for marital_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_users_marital_status_check'
  ) THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_marital_status_check
      CHECK (marital_status IN ('Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf(ve)'));
  END IF;
END $$;

-- Add constraint for office_position values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_users_office_position_check'
  ) THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_office_position_check
      CHECK (
        office_position IS NULL OR 
        office_position IN ('RH', 'Magasinier', 'Secrétariat', 'Assistant', 'Finance', 'Comptable', 'Directeur', 'Coordinateur')
      );
  END IF;
END $$;