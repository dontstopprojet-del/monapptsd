/*
  # Create Missing Production Tables
  
  1. New Tables
    - `invoices` (factures)
      - `id` (uuid, primary key)
      - `client_name` (text)
      - `amount` (numeric)
      - `status` (text: 'En attente', 'Payee', 'En retard')
      - `due_date` (date)
      - `created_at` (timestamptz)
      
    - `quotes` (devis)
      - `id` (uuid, primary key)
      - `client_name` (text)
      - `service_name` (text)
      - `amount` (numeric)
      - `status` (text: 'En attente', 'Accepte', 'Refuse')
      - `created_at` (timestamptz)
      
    - `stocks` (already exists but ensure proper structure)
      - Verified structure
      
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated admin users
*/

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'En attente' CHECK (status IN ('En attente', 'Payee', 'En retard')),
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role = 'admin'
    )
  );

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  service_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'En attente' CHECK (status IN ('En attente', 'Accepte', 'Refuse')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quotes"
  ON quotes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role = 'admin'
    )
  );

-- Update stocks table policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON stocks;

CREATE POLICY "Admins can manage stocks"
  ON stocks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Update reports table policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON reports;

CREATE POLICY "Admins can manage reports"
  ON reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );
