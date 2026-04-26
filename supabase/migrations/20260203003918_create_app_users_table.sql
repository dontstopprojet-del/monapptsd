/*
  # Create app_users table for TSD et Fils

  1. New Tables
    - `app_users`
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `name` (text, not null)
      - `phone` (text)
      - `role` (text, not null) - 'client', 'tech', or 'admin'
      - `birth_date` (date) - User's date of birth for birthday notifications
      - `contract_date` (date) - Date when user signed up / contract started
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `app_users` table
    - Add policies for authenticated users to manage their own data
    - Add policy for admins to view all users

  3. Notes
    - birth_date is used for birthday reminders sent to admin
    - contract_date marks the anniversary of the contractual relationship
*/

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'tech', 'admin')),
  birth_date date,
  contract_date date DEFAULT CURRENT_DATE,
  profile_photo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON app_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON app_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all users"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_birth_date ON app_users(birth_date);
CREATE INDEX IF NOT EXISTS idx_app_users_contract_date ON app_users(contract_date);