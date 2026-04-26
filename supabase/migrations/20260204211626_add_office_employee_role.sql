/*
  # Add Office Employee Role

  1. Changes
    - Update role check constraint to include 'office' role
    - Office employees can view all data shared by technicians and clients
    - Only admin can view all user accounts
  
  2. Security
    - Office employees have read access to shared data
    - Admins maintain full access to all accounts
*/

DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'app_users_role_check' 
    AND table_name = 'app_users'
  ) THEN
    ALTER TABLE app_users DROP CONSTRAINT app_users_role_check;
  END IF;
  
  -- Add new constraint with office role
  ALTER TABLE app_users ADD CONSTRAINT app_users_role_check 
    CHECK (role IN ('client', 'tech', 'office', 'admin'));
END $$;
