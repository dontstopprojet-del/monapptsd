/*
  # Fix All RLS Policies Referencing auth.users

  1. Problem
    - Multiple tables (quotes, reports, stocks) have RLS policies that reference auth.users directly
    - This causes "permission denied for table users" errors
    - Anonymous and authenticated users don't have permission to query auth.users

  2. Solution
    - Drop all existing policies that reference auth.users
    - Create new policies using auth.uid() directly with app_users
    - This avoids querying auth.users table

  3. Security
    - Maintains same security level
    - Only authorized roles can manage their respective tables
*/

-- Fix quotes table
DROP POLICY IF EXISTS "Admins can manage quotes" ON quotes;

CREATE POLICY "Admins can manage quotes"
  ON quotes
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

-- Fix reports table
DROP POLICY IF EXISTS "Admins can manage reports" ON reports;

CREATE POLICY "Admins can manage reports"
  ON reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Fix stocks table
DROP POLICY IF EXISTS "Admins can manage stocks" ON stocks;

CREATE POLICY "Admins can manage stocks"
  ON stocks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );
