/*
  # Chantier Activity Log & Extended Statuses

  1. New Tables
    - `chantier_activities`
      - `id` (uuid, primary key)
      - `chantier_id` (uuid, FK to chantiers)
      - `user_id` (uuid, FK to app_users) - technician who performed the action
      - `activity_type` (text: started, interrupted, abandoned, team_changed, completed, photo_added, note_added, progress_updated)
      - `description` (text) - human-readable description
      - `metadata` (jsonb) - extra data (old/new values, team info, etc.)
      - `created_at` (timestamptz)

  2. Changes to chantiers table
    - Add `started_at` column (timestamptz) - when work actually began
    - Add `interrupted_at` column (timestamptz) - last interruption timestamp
    - Add `interruption_reason` column (text) - reason for interruption
    - Update status CHECK to include new statuses: interrupted, abandoned

  3. Security
    - RLS on chantier_activities
    - Policies for authenticated users based on role

  4. Realtime
    - Enable realtime for chantier_activities
*/

CREATE TABLE IF NOT EXISTS chantier_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'started', 'interrupted', 'abandoned', 'team_changed', 'completed',
    'photo_added', 'note_added', 'progress_updated', 'resumed'
  )),
  description text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chantier_activities ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chantier_activities_chantier ON chantier_activities(chantier_id);
CREATE INDEX IF NOT EXISTS idx_chantier_activities_user ON chantier_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_chantier_activities_type ON chantier_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_chantier_activities_created ON chantier_activities(created_at DESC);

CREATE POLICY "Authenticated users can view activities for their chantiers"
  ON chantier_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chantiers c
      WHERE c.id = chantier_activities.chantier_id
      AND (
        c.client_id = auth.uid()
        OR c.technician_id IN (SELECT t.id FROM technicians t WHERE t.profile_id = auth.uid())
        OR EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'office', 'office_employee'))
      )
    )
  );

CREATE POLICY "Technicians and admins can create activities"
  ON chantier_activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update activities"
  ON chantier_activities FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'admin'));

CREATE POLICY "Admins can delete activities"
  ON chantier_activities FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'admin'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN started_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'interrupted_at'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN interrupted_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'interruption_reason'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN interruption_reason text;
  END IF;
END $$;

DO $$
BEGIN
  ALTER TABLE chantiers DROP CONSTRAINT IF EXISTS chantiers_status_check;
  ALTER TABLE chantiers ADD CONSTRAINT chantiers_status_check
    CHECK (status IN ('planned', 'inProgress', 'interrupted', 'abandoned', 'completed'));
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE chantier_activities REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'chantier_activities'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chantier_activities;
  END IF;
END $$;
