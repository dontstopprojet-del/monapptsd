/*
  # Fix missing INSERT policies for maintenance contracts

  ## Problem
  The tables `contrats_maintenance` and `visites_contrat` have RLS enabled
  but no INSERT policies exist, blocking admins and office users from
  creating contracts and visits.

  ## Changes
  1. Add INSERT policy on `contrats_maintenance` for admin and office roles
  2. Add INSERT policy on `visites_contrat` for admin and office roles
*/

CREATE POLICY "admin_office_insert_contracts"
  ON contrats_maintenance
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role = ANY(ARRAY['admin', 'office'])
    )
  );

CREATE POLICY "admin_office_insert_visits"
  ON visites_contrat
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role = ANY(ARRAY['admin', 'office'])
    )
  );
