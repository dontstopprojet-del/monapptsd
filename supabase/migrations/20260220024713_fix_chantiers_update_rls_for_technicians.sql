/*
  # Fix chantiers UPDATE RLS policy for technicians

  1. Problem
    - The existing UPDATE policy checks `technician_id = auth.uid()` 
    - But `chantiers.technician_id` stores the ID from the `technicians` table, not the auth user ID
    - This causes all technician updates (like "Debut chantier") to be silently blocked

  2. Fix
    - Replace the policy with one that joins through the `technicians` table
    - Checks `technicians.profile_id = auth.uid()` to match the auth user
    - Admin/office roles remain unchanged
*/

DROP POLICY IF EXISTS "Authenticated users can update relevant chantiers" ON chantiers;

CREATE POLICY "Authenticated users can update relevant chantiers"
  ON chantiers
  FOR UPDATE
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'ceo', 'office')
    ))
    OR
    (EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = chantiers.technician_id
      AND t.profile_id = (SELECT auth.uid())
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'ceo', 'office')
    ))
    OR
    (EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = chantiers.technician_id
      AND t.profile_id = (SELECT auth.uid())
    ))
  );
