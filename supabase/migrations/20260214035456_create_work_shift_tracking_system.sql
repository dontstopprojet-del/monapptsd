/*
  # Work Shift Tracking System

  ## Overview
  Complete real-time tracking system for technicians and office employees with:
  - Work sessions (start/end of day)
  - Real-time location tracking
  - Battery level monitoring
  - Kilometer and hours counters
  - Break management with automatic timers
  - Status tracking (in service, on break, available, sick, leave, offline, other)

  ## New Tables

  ### 1. `work_sessions`
  Tracks daily work sessions for each user
  - `id` (uuid, primary key)
  - `user_id` (uuid, references app_users)
  - `session_date` (date)
  - `start_time` (timestamptz) - When user starts their day
  - `end_time` (timestamptz) - When user ends their day
  - `total_hours` (decimal) - Calculated total hours worked
  - `total_kilometers` (decimal) - Total km traveled during session
  - `start_battery` (integer) - Battery level at start
  - `end_battery` (integer) - Battery level at end
  - `start_location_lat` (decimal)
  - `start_location_lng` (decimal)
  - `end_location_lat` (decimal)
  - `end_location_lng` (decimal)
  - `created_at` (timestamptz)

  ### 2. `work_session_events`
  Tracks events during work sessions (breaks, mission end, etc.)
  - `id` (uuid, primary key)
  - `session_id` (uuid, references work_sessions)
  - `event_type` (text) - 'break_start', 'break_end', 'mission_end', 'status_change'
  - `event_time` (timestamptz)
  - `duration_minutes` (integer) - For breaks
  - `location_lat` (decimal)
  - `location_lng` (decimal)
  - `battery_level` (integer)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 3. `user_real_time_status`
  Stores current real-time status for each user
  - `user_id` (uuid, primary key, references app_users)
  - `status` (text) - 'in_service', 'on_break', 'available', 'sick', 'on_leave', 'offline', 'other'
  - `current_session_id` (uuid, references work_sessions)
  - `current_location_lat` (decimal)
  - `current_location_lng` (decimal)
  - `current_battery` (integer)
  - `current_kilometers` (decimal)
  - `current_hours` (decimal)
  - `break_start_time` (timestamptz)
  - `break_duration_minutes` (integer)
  - `is_on_break` (boolean)
  - `last_updated` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can read their own status and sessions
  - Office and admin roles can read all statuses
  - Only authenticated users can update their own status

  ## Indexes
  - Index on user_id for fast lookups
  - Index on session_date for daily queries
  - Index on status for filtering by status
*/

-- Create work_sessions table
CREATE TABLE IF NOT EXISTS work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_hours decimal(10, 2) DEFAULT 0,
  total_kilometers decimal(10, 2) DEFAULT 0,
  start_battery integer,
  end_battery integer,
  start_location_lat decimal(10, 7),
  start_location_lng decimal(10, 7),
  end_location_lat decimal(10, 7),
  end_location_lng decimal(10, 7),
  created_at timestamptz DEFAULT now()
);

-- Create work_session_events table
CREATE TABLE IF NOT EXISTS work_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  location_lat decimal(10, 7),
  location_lng decimal(10, 7),
  battery_level integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create user_real_time_status table
CREATE TABLE IF NOT EXISTS user_real_time_status (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline',
  current_session_id uuid REFERENCES work_sessions(id) ON DELETE SET NULL,
  current_location_lat decimal(10, 7),
  current_location_lng decimal(10, 7),
  current_battery integer,
  current_kilometers decimal(10, 2) DEFAULT 0,
  current_hours decimal(10, 2) DEFAULT 0,
  break_start_time timestamptz,
  break_duration_minutes integer,
  is_on_break boolean DEFAULT false,
  last_updated timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON work_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_session_date ON work_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_work_session_events_session_id ON work_session_events(session_id);
CREATE INDEX IF NOT EXISTS idx_user_real_time_status_status ON user_real_time_status(status);

-- Enable Row Level Security
ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_session_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_real_time_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies for work_sessions
CREATE POLICY "Users can view their own work sessions"
  ON work_sessions FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office_employee')
    )
  );

CREATE POLICY "Users can create their own work sessions"
  ON work_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own work sessions"
  ON work_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for work_session_events
CREATE POLICY "Users can view events from their sessions"
  ON work_session_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = work_session_events.session_id
      AND (
        work_sessions.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM app_users
          WHERE app_users.id = auth.uid()
          AND app_users.role IN ('admin', 'office_employee')
        )
      )
    )
  );

CREATE POLICY "Users can create events for their sessions"
  ON work_session_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM work_sessions
      WHERE work_sessions.id = work_session_events.session_id
      AND work_sessions.user_id = auth.uid()
    )
  );

-- RLS Policies for user_real_time_status
CREATE POLICY "Users can view their own status"
  ON user_real_time_status FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office_employee')
    )
  );

CREATE POLICY "Users can insert their own status"
  ON user_real_time_status FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own status"
  ON user_real_time_status FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_user_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update timestamp on status changes
DROP TRIGGER IF EXISTS trigger_update_user_status_timestamp ON user_real_time_status;
CREATE TRIGGER trigger_update_user_status_timestamp
  BEFORE UPDATE ON user_real_time_status
  FOR EACH ROW
  EXECUTE FUNCTION update_user_status_timestamp();

-- Function to initialize user status when they sign up
CREATE OR REPLACE FUNCTION initialize_user_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_real_time_status (user_id, status)
  VALUES (NEW.id, 'offline')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to initialize status for new users
DROP TRIGGER IF EXISTS trigger_initialize_user_status ON app_users;
CREATE TRIGGER trigger_initialize_user_status
  AFTER INSERT ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_status();