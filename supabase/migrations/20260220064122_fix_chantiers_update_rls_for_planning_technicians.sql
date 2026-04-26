/*
  # Fix chantiers UPDATE RLS policy for planning technicians

  1. Changes
    - Update the chantiers UPDATE policy to also allow technicians
      assigned via planning_technicians table to update chantier status
    - This fixes the "Debut chantier" button not working for technicians
      who are assigned through the planning system rather than directly

  2. Security
    - Still restricted to authenticated users only
    - Admin/CEO/office can update any chantier
    - Direct technician (chantiers.technician_id) can update
    - Planning-assigned technicians (via planning_technicians) can also update
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
      AND app_users.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'office'::text])
    ))
    OR
    (EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = chantiers.technician_id
      AND t.profile_id = (SELECT auth.uid())
    ))
    OR
    (EXISTS (
      SELECT 1 FROM planning_technicians pt
      JOIN planning p ON p.id = pt.planning_id
      WHERE p.chantier_id = chantiers.id
      AND pt.technician_id IN (
        SELECT t2.id FROM technicians t2 WHERE t2.profile_id = (SELECT auth.uid())
      )
    ))
  )
  WITH CHECK (
    (EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role = ANY (ARRAY['admin'::text, 'ceo'::text, 'office'::text])
    ))
    OR
    (EXISTS (
      SELECT 1 FROM technicians t
      WHERE t.id = chantiers.technician_id
      AND t.profile_id = (SELECT auth.uid())
    ))
    OR
    (EXISTS (
      SELECT 1 FROM planning_technicians pt
      JOIN planning p ON p.id = pt.planning_id
      WHERE p.chantier_id = chantiers.id
      AND pt.technician_id IN (
        SELECT t2.id FROM technicians t2 WHERE t2.profile_id = (SELECT auth.uid())
      )
    ))
  );
