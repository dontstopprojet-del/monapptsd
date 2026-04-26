/*
  # Add Appointments System

  1. New Tables
    - `appointments`
      - `id` (uuid, primary key)
      - `quote_id` (uuid, foreign key to quote_requests) - Devis associé
      - `user_id` (uuid, foreign key to auth.users) - Client
      - `scheduled_date` (date) - Date du RDV
      - `scheduled_time` (text) - Heure du RDV
      - `service_type` (text) - Type de service
      - `address` (text) - Adresse du RDV
      - `location_coordinates` (jsonb) - Coordonnées GPS
      - `notes` (text) - Notes du client
      - `status` (text) - pending, confirmed, completed, cancelled
      - `assigned_to` (uuid, foreign key to app_users) - Technicien assigné
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      - `confirmed_at` (timestamptz) - Date de confirmation par l'admin
      - `completed_at` (timestamptz) - Date de complétion

  2. Security
    - Enable RLS on `appointments` table
    - Clients can create appointments for their own quotes
    - Clients can view their own appointments
    - Admins and technicians can view and manage all appointments
    - Clients can cancel their pending appointments
*/

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quote_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  service_type text NOT NULL,
  address text,
  location_coordinates jsonb,
  notes text,
  status text DEFAULT 'pending',
  assigned_to uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Clients can create appointments for their own quotes
CREATE POLICY "Clients can create their own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Clients can view their own appointments
CREATE POLICY "Clients can view their own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Clients can update their own pending appointments
CREATE POLICY "Clients can update their own pending appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'cancelled'));

-- Admins can view all appointments
CREATE POLICY "Admins can view all appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- Admins can update all appointments
CREATE POLICY "Admins can update all appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- Technicians can view appointments assigned to them
CREATE POLICY "Technicians can view their assigned appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'technician'
      AND (appointments.assigned_to = auth.uid() OR appointments.assigned_to IS NULL)
    )
  );

-- Technicians can update their assigned appointments
CREATE POLICY "Technicians can update their assigned appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'technician'
      AND appointments.assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'technician'
      AND appointments.assigned_to = auth.uid()
    )
  );

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_quote_id ON appointments(quote_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON appointments(assigned_to);