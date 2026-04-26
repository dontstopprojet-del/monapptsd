/*
  # Create user_locations table for GPS tracking

  1. New Tables
    - `user_locations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to app_users)
      - `latitude` (numeric)
      - `longitude` (numeric)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `user_locations` table
    - Add policy for authenticated users to read all locations
    - Add policy for users to insert/update their own location
*/

CREATE TABLE IF NOT EXISTS user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all locations"
  ON user_locations
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own location"
  ON user_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location"
  ON user_locations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location"
  ON user_locations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_locations_user_id ON user_locations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_locations_updated_at ON user_locations(updated_at DESC);
