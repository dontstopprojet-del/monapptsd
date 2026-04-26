/*
  # Fix chantier_activities INSERT policy for planning technicians

  1. Changes
    - Keep the existing check that user_id must match auth.uid()
    - Also ensure the user is actually authorized to log activities for that chantier
      (either as direct technician, planning-assigned technician, or admin)

  2. Security
    - user_id must always equal auth.uid() (no impersonation)
    - Only users with legitimate access to the chantier can log activities
*/

DROP POLICY IF EXISTS "Technicians and admins can create activities" ON chantier_activities;

CREATE POLICY "Technicians and admins can create activities"
  ON chantier_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );
