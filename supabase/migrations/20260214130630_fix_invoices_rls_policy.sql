/*
  # Fix Invoices RLS Policy

  1. Problem
    - The current RLS policy for `invoices` table references `auth.users` table directly
    - This causes a "permission denied for table users" error
    - Anonymous and authenticated users don't have permission to query `auth.users` directly

  2. Solution
    - Drop the existing policy that references auth.users
    - Create a new policy that only checks app_users.role using auth.uid()
    - This avoids the need to query auth.users directly

  3. Security
    - Only authenticated users with admin role can manage invoices
    - Uses proper auth.uid() function instead of querying users table
*/

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;

-- Create a new policy that doesn't reference auth.users
CREATE POLICY "Admins can manage invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );
