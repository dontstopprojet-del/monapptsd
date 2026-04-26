/*
  # Fix chantiers SELECT RLS policy for technicians

  1. Problem
    - The existing SELECT policy checks `technician_id = auth.uid()`, but
      `technician_id` stores `technicians.id` (not `app_users.id`/`auth.uid()`)
    - This means technicians can ONLY see their chantiers through the
      `planning_technicians` path, and the direct `technician_id` check never matches

  2. Fix
    - Replace the broken `technician_id = auth.uid()` check with a proper
      subquery: `technician_id IN (SELECT id FROM technicians WHERE profile_id = auth.uid())`
    - Keep all other access paths (admin/ceo/office, client_id, planning_technicians)

  3. Security
    - All authenticated access paths are preserved and corrected
    - Public access to validated/public projects remains unchanged
*/

DROP POLICY IF EXISTS "Authenticated users can view relevant chantiers" ON chantiers;

CREATE POLICY "Authenticated users can view relevant chantiers"
  ON chantiers
  FOR SELECT
  TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'ceo', 'office')
    ))
    OR (client_id = (SELECT auth.uid()))
    OR (technician_id IN (
      SELECT t.id FROM technicians t WHERE t.profile_id = (SELECT auth.uid())
    ))
    OR (EXISTS (
      SELECT 1 FROM planning_technicians pt
      JOIN planning p ON pt.planning_id = p.id
      WHERE p.chantier_id = chantiers.id
      AND pt.technician_id IN (
        SELECT t2.id FROM technicians t2 WHERE t2.profile_id = (SELECT auth.uid())
      )
    ))
  );
