/*
  # Create Employee Absences Tracking Table

  1. New Tables
    - `absences`
      - `id` (uuid, primary key)
      - `employe_id` (uuid, references app_users)
      - `date_debut` (date, start date of absence)
      - `date_fin` (date, end date of absence)
      - `nombre_jours` (numeric, number of days absent)
      - `motif` (text, reason for absence)
      - `justifie` (boolean, whether justified or not)
      - `created_at` (timestamptz, auto)
      - `created_by` (uuid, who recorded it)

  2. Security
    - Enable RLS on `absences` table
    - Admin/office can manage all absences
    - Employees can view their own absences

  3. Important Notes
    - This table tracks employee absences with motifs for payslip generation
    - Absences feed into the payslip auto-generation system
*/

CREATE TABLE IF NOT EXISTS absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  nombre_jours numeric NOT NULL DEFAULT 0,
  motif text NOT NULL DEFAULT '',
  justifie boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id)
);

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_absences_employe_id ON absences(employe_id);
CREATE INDEX IF NOT EXISTS idx_absences_date_debut ON absences(date_debut);

CREATE POLICY "Admin and office can view all absences"
  ON absences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admin and office can insert absences"
  ON absences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admin and office can update absences"
  ON absences FOR UPDATE
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

CREATE POLICY "Admin and office can delete absences"
  ON absences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Employees can view own absences"
  ON absences FOR SELECT
  TO authenticated
  USING (employe_id = auth.uid());
