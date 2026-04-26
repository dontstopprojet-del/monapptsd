/*
  # Fix Admin Access to Quotes with Simplified Policy

  1. Changes
    - Drop existing admin_select_all_quotes policy
    - Create new simplified policy that checks role directly in app_users table
    - This avoids potential issues with function context in RLS policies

  2. Security
    - Maintains RLS protection
    - Allows admins and office staff to see all quotes
    - Regular users still only see their own quotes
*/

-- Drop the existing admin select policy
DROP POLICY IF EXISTS "admin_select_all_quotes" ON quote_requests;

-- Create a new simplified policy that checks role directly
CREATE POLICY "admin_and_office_select_all_quotes"
  ON quote_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Also update the UPDATE and DELETE policies to use the same pattern
DROP POLICY IF EXISTS "admin_update_all_quotes" ON quote_requests;
DROP POLICY IF EXISTS "admin_delete_quotes" ON quote_requests;

CREATE POLICY "admin_and_office_update_all_quotes"
  ON quote_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "admin_and_office_delete_quotes"
  ON quote_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );
