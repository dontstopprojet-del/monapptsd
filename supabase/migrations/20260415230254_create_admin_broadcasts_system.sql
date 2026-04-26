/*
  # Create Admin Broadcasts System

  1. New Tables
    - `admin_broadcasts`
      - `id` (uuid, primary key)
      - `author_id` (uuid, references app_users)
      - `title` (text) - broadcast title
      - `message` (text) - broadcast content
      - `type` (text) - type: announcement, promotion, alert, info
      - `target_roles` (text[]) - which roles see this: client, tech, office, visitor
      - `is_active` (boolean) - whether currently displayed
      - `priority` (text) - low, medium, high, urgent
      - `starts_at` (timestamptz) - when to start showing
      - `expires_at` (timestamptz) - when to stop showing (nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `admin_broadcasts` table
    - Admin can CRUD all broadcasts
    - Authenticated users can read active broadcasts targeting their role
    - Anonymous users can read active broadcasts targeting visitors
*/

CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'announcement',
  target_roles text[] NOT NULL DEFAULT '{client,tech,office,visitor}',
  is_active boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'medium',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_active ON admin_broadcasts (is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_admin_broadcasts_author ON admin_broadcasts (author_id);

CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
    AND role = 'admin'
  );
$$;

CREATE POLICY "Admins can insert broadcasts"
  ON admin_broadcasts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can update broadcasts"
  ON admin_broadcasts
  FOR UPDATE
  TO authenticated
  USING (is_admin_user())
  WITH CHECK (is_admin_user());

CREATE POLICY "Admins can delete broadcasts"
  ON admin_broadcasts
  FOR DELETE
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Admins can read all broadcasts"
  ON admin_broadcasts
  FOR SELECT
  TO authenticated
  USING (is_admin_user());

CREATE POLICY "Authenticated users can read active broadcasts"
  ON admin_broadcasts
  FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND starts_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND NOT is_admin_user()
  );

CREATE POLICY "Anonymous users can read active visitor broadcasts"
  ON admin_broadcasts
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND starts_at <= now()
    AND (expires_at IS NULL OR expires_at > now())
    AND 'visitor' = ANY(target_roles)
  );

ALTER TABLE admin_broadcasts REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_broadcasts;
