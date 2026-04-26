/*
  # Add Incidents and Non-Compete Signatures

  1. New Tables
    - `incidents`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `incident_type` (text: safety, equipment, quality, other)
      - `severity` (text: low, medium, high, critical)
      - `title` (text)
      - `description` (text)
      - `location` (text)
      - `incident_date` (timestamptz)
      - `images` (jsonb, array of image URLs)
      - `status` (text: open, investigating, resolved, closed)
      - `created_at` (timestamptz)
    
    - `non_compete_signatures`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `signed` (boolean)
      - `signed_at` (timestamptz)
      - `terms_version` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for viewing incidents (user can view own incidents)
*/

-- Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  incident_type text NOT NULL,
  severity text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  location text,
  incident_date timestamptz DEFAULT now(),
  images jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own incidents"
  ON incidents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own incidents"
  ON incidents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own incidents"
  ON incidents FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Non-Compete Signatures Table
CREATE TABLE IF NOT EXISTS non_compete_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  signed boolean DEFAULT false,
  signed_at timestamptz,
  terms_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE non_compete_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own non-compete signatures"
  ON non_compete_signatures FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own non-compete signatures"
  ON non_compete_signatures FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own non-compete signatures"
  ON non_compete_signatures FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);