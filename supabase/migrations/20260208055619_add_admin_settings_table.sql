/*
  # Create Admin Settings Table

  1. New Tables
    - `admin_settings`
      - `id` (uuid, primary key) - Unique identifier
      - `setting_key` (text, unique) - Key for the setting (e.g., 'legal_terms_fr', 'legal_terms_en')
      - `setting_value` (text) - Value of the setting
      - `setting_type` (text) - Type of setting (e.g., 'legal', 'company_info', 'chatbot')
      - `updated_at` (timestamptz) - Last update timestamp
      - `updated_by` (uuid) - User who last updated the setting
  
  2. Security
    - Enable RLS on `admin_settings` table
    - Add policy for all users to read settings
    - Add policy for admin users to update settings
*/

CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text NOT NULL DEFAULT '',
  setting_type text NOT NULL DEFAULT 'general',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view admin settings"
  ON admin_settings
  FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Only admin can insert admin settings"
  ON admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Only admin can update admin settings"
  ON admin_settings
  FOR UPDATE
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

CREATE POLICY "Only admin can delete admin settings"
  ON admin_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

INSERT INTO admin_settings (setting_key, setting_value, setting_type) VALUES
  ('legal_terms_fr', 'Mentions légales de TSD et Fils - Version française', 'legal'),
  ('legal_terms_en', 'Legal terms of TSD et Fils - English version', 'legal'),
  ('company_info', '{"name": "TSD et Fils", "description": "Entreprise de services et de maintenance", "founded": "2020", "location": "Guinée"}', 'company_info'),
  ('chatbot_context', 'TSD et Fils est une entreprise spécialisée dans les services de maintenance et de sécurité. Nous offrons des solutions de qualité à nos clients en Guinée.', 'chatbot')
ON CONFLICT (setting_key) DO NOTHING;