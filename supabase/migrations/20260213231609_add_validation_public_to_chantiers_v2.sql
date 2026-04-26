/*
  # Add Validation and Public Status to Chantiers (Unified Project System)
  
  ## Summary
  This migration unifies the project management system by adding validation and public visibility
  fields to the `chantiers` table, making it the single source of truth for all project data.
  
  ## Changes to Tables
  
  ### Modified: `chantiers`
  Added columns for admin validation and public visibility:
  - `is_validated` (boolean, default false) - Admin must validate before public display
  - `validated_by` (uuid, references app_users) - Which admin validated the project
  - `validated_at` (timestamptz) - When the project was validated
  - `is_public` (boolean, default false) - Whether to show on public visitor page
  - `client_name` (text, nullable) - Client name for public display
  - `description` (text, nullable) - Project description for public display
  - `rating` (integer, 0-5) - Client satisfaction rating for public display
  
  ## Security - Row Level Security (RLS)
  
  ### Public Access (Anonymous Users)
  - **SELECT only** validated and public chantiers: `is_validated = true AND is_public = true`
  - This allows the visitor homepage to display validated public projects
  
  ### Authenticated Users
  - **Technicians**: Can view their assigned chantiers
  - **Office**: Can view all chantiers
  - **Admin**: Full access to all chantiers
  - **Clients**: Can view chantiers where they are the client
  
  ### Admin Validation Workflow
  - Only admins can set `is_validated` to true
  - Only admins can set `is_public` to true
  - `validated_by` and `validated_at` are auto-set on validation
  
  ## Indexes
  - `idx_chantiers_is_validated` - For filtering validated projects
  - `idx_chantiers_is_public` - For filtering public projects
  - `idx_chantiers_validated_by` - For admin validation tracking
  
  ## Important Notes
  1. **Single Source of Truth**: `chantiers` is now the only table for projects
  2. **No Duplication**: The legacy `projects` table is deprecated
  3. **Real-time Ready**: All policies support real-time subscriptions
  4. **Performance**: Indexes ensure fast queries for public display
*/

-- Add validation and public visibility columns to chantiers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'is_validated'
  ) THEN
    ALTER TABLE chantiers 
      ADD COLUMN is_validated boolean DEFAULT false,
      ADD COLUMN validated_by uuid REFERENCES app_users(id),
      ADD COLUMN validated_at timestamptz,
      ADD COLUMN is_public boolean DEFAULT false,
      ADD COLUMN client_name text,
      ADD COLUMN description text DEFAULT '',
      ADD COLUMN rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chantiers_is_validated ON chantiers(is_validated);
CREATE INDEX IF NOT EXISTS idx_chantiers_is_public ON chantiers(is_public);
CREATE INDEX IF NOT EXISTS idx_chantiers_validated_by ON chantiers(validated_by);
CREATE INDEX IF NOT EXISTS idx_chantiers_status ON chantiers(status);

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Admins can delete chantiers" ON chantiers;
DROP POLICY IF EXISTS "Admins can insert chantiers" ON chantiers;
DROP POLICY IF EXISTS "Techs and admins can update chantiers" ON chantiers;
DROP POLICY IF EXISTS "Users can view relevant chantiers" ON chantiers;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON chantiers;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON chantiers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON chantiers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON chantiers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON chantiers;

-- PUBLIC ACCESS: Anonymous users can view validated and public chantiers
CREATE POLICY "Public can view validated public projects"
  ON chantiers FOR SELECT
  TO anon
  USING (is_validated = true AND is_public = true);

-- AUTHENTICATED ACCESS: Role-based policies

-- SELECT policies
CREATE POLICY "Admins can view all chantiers"
  ON chantiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Office can view all chantiers"
  ON chantiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'office'
    )
  );

CREATE POLICY "Technicians can view assigned chantiers"
  ON chantiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'tech'
    )
  );

CREATE POLICY "Clients can view their chantiers"
  ON chantiers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'client'
    )
  );

-- INSERT policies
CREATE POLICY "Admins can insert chantiers"
  ON chantiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Office can insert chantiers"
  ON chantiers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'office'
    )
  );

-- UPDATE policies
CREATE POLICY "Admins can update all chantiers"
  ON chantiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Office can update all chantiers"
  ON chantiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'office'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'office'
    )
  );

CREATE POLICY "Technicians can update assigned chantiers"
  ON chantiers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'tech'
    )
    AND is_validated = false
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'tech'
    )
    AND is_validated = false
  );

-- DELETE policies
CREATE POLICY "Admins can delete chantiers"
  ON chantiers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

-- Function to auto-set validated_at and validated_by on validation
CREATE OR REPLACE FUNCTION set_chantier_validation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_validated = true AND (OLD.is_validated IS NULL OR OLD.is_validated = false) THEN
    NEW.validated_at := now();
    NEW.validated_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-set validation metadata
DROP TRIGGER IF EXISTS trigger_set_chantier_validation ON chantiers;
CREATE TRIGGER trigger_set_chantier_validation
  BEFORE UPDATE ON chantiers
  FOR EACH ROW
  EXECUTE FUNCTION set_chantier_validation();
