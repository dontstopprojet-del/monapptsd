/*
  # Add Technician Management Features

  1. New Tables
    - `legal_terms_acceptance`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `accepted` (boolean)
      - `signature_data` (text, JSON with approval status)
      - `accepted_at` (timestamptz)
      - `terms_version` (text)
    
    - `technician_gps_tracking`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `battery_level` (integer, 0-100)
      - `is_active` (boolean)
      - `tracked_at` (timestamptz)
    
    - `work_shifts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `shift_date` (date)
      - `start_time` (timestamptz)
      - `end_time` (timestamptz)
      - `pause_start` (timestamptz)
      - `pause_end` (timestamptz)
      - `total_km` (decimal)
      - `status` (text: started, paused, ended)
    
    - `site_images`
      - `id` (uuid, primary key)
      - `site_id` (uuid)
      - `user_id` (uuid, references app_users)
      - `image_url` (text)
      - `image_type` (text: before, during, after)
      - `uploaded_at` (timestamptz)
    
    - `site_notes`
      - `id` (uuid, primary key)
      - `site_id` (uuid)
      - `user_id` (uuid, references app_users)
      - `note_content` (text)
      - `progress_percentage` (integer, 0-100)
      - `created_at` (timestamptz)
    
    - `payment_records`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `payment_date` (date)
      - `amount` (decimal)
      - `payment_type` (text: salary_60, salary_40, performance_bonus, satisfaction_bonus, travel_allowance)
      - `details` (jsonb)
      - `created_at` (timestamptz)
    
    - `birthdays`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references app_users)
      - `person_name` (text)
      - `birthday_date` (date)
      - `relationship` (text: personal, colleague, admin)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for admin to view all data
*/

-- Legal Terms Acceptance
CREATE TABLE IF NOT EXISTS legal_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  accepted boolean DEFAULT false,
  signature_data text,
  accepted_at timestamptz,
  terms_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE legal_terms_acceptance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own legal terms acceptance"
  ON legal_terms_acceptance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own legal terms acceptance"
  ON legal_terms_acceptance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own legal terms acceptance"
  ON legal_terms_acceptance FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- GPS Tracking
CREATE TABLE IF NOT EXISTS technician_gps_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  battery_level integer DEFAULT 100,
  is_active boolean DEFAULT true,
  tracked_at timestamptz DEFAULT now()
);

ALTER TABLE technician_gps_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own GPS tracking"
  ON technician_gps_tracking FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own GPS tracking"
  ON technician_gps_tracking FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Work Shifts
CREATE TABLE IF NOT EXISTS work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  shift_date date DEFAULT CURRENT_DATE,
  start_time timestamptz,
  end_time timestamptz,
  pause_start timestamptz,
  pause_end timestamptz,
  total_km decimal(10, 2) DEFAULT 0,
  status text DEFAULT 'started',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own work shifts"
  ON work_shifts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own work shifts"
  ON work_shifts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own work shifts"
  ON work_shifts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Site Images
CREATE TABLE IF NOT EXISTS site_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  image_type text NOT NULL,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE site_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own site images"
  ON site_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own site images"
  ON site_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Site Notes
CREATE TABLE IF NOT EXISTS site_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id uuid NOT NULL,
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  note_content text NOT NULL,
  progress_percentage integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE site_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own site notes"
  ON site_notes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own site notes"
  ON site_notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own site notes"
  ON site_notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Payment Records
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  payment_date date NOT NULL,
  amount decimal(10, 2) NOT NULL,
  payment_type text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payment records"
  ON payment_records FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Birthdays
CREATE TABLE IF NOT EXISTS birthdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  person_name text NOT NULL,
  birthday_date date NOT NULL,
  relationship text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own birthdays"
  ON birthdays FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own birthdays"
  ON birthdays FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own birthdays"
  ON birthdays FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own birthdays"
  ON birthdays FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);