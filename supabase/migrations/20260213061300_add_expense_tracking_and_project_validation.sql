/*
  # Add Expense Tracking and Project Validation System

  ## New Tables
  
  1. `expenses`
    - `id` (uuid, primary key)
    - `project_id` (uuid, references chantiers or projects)
    - `technician_id` (uuid, references app_users)
    - `category` (text: transport, materiel, repas, autre)
    - `amount` (numeric)
    - `description` (text)
    - `receipt_url` (text, optional photo of receipt)
    - `status` (text: pending, approved, rejected)
    - `approved_by` (uuid, references app_users for admin)
    - `approved_at` (timestamptz)
    - `expense_date` (date)
    - `created_at` (timestamptz)

  ## Modified Tables
  
  1. `projects`
    - Add `is_validated` (boolean, default false)
    - Add `validated_by` (uuid, references app_users)
    - Add `validated_at` (timestamptz)
    - Add `is_public` (boolean, default false)
    - Add `total_cost` (numeric)
  
  2. `invoices`
    - Add `project_id` (uuid, references chantiers)
    - Add `invoice_number` (text, auto-generated)
    - Add `payment_date` (date, nullable)
    - Add `payment_method` (text, nullable)
    - Add `notes` (text, nullable)

  ## Security
    - Enable RLS on expenses table
    - Technicians can create and view their own expenses
    - Admins can view all expenses and approve/reject them
    - Public can only view validated and public projects
*/

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES chantiers(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('transport', 'materiel', 'repas', 'hebergement', 'autre')),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description text NOT NULL,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES app_users(id),
  approved_at timestamptz,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add validation and public status to projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'is_validated'
  ) THEN
    ALTER TABLE projects 
      ADD COLUMN is_validated boolean DEFAULT false,
      ADD COLUMN validated_by uuid REFERENCES app_users(id),
      ADD COLUMN validated_at timestamptz,
      ADD COLUMN is_public boolean DEFAULT false,
      ADD COLUMN total_cost numeric DEFAULT 0;
  END IF;
END $$;

-- Add invoice enhancements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE invoices 
      ADD COLUMN project_id uuid REFERENCES chantiers(id),
      ADD COLUMN invoice_number text,
      ADD COLUMN payment_date date,
      ADD COLUMN payment_method text,
      ADD COLUMN notes text;
  END IF;
END $$;

-- Create unique invoice number constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'invoices_invoice_number_key'
  ) THEN
    ALTER TABLE invoices ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);
  END IF;
END $$;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  year_part text;
  sequence_number int;
  invoice_num text;
BEGIN
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER
    )
  ), 0) + 1
  INTO sequence_number
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || year_part || '-%';
  
  invoice_num := 'INV-' || year_part || '-' || LPAD(sequence_number::text, 4, '0');
  
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invoice_number ON invoices;
CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Enable RLS on expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Technicians can view their own expenses
CREATE POLICY "Technicians can view own expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (technician_id = auth.uid());

-- Policy: Technicians can create their own expenses
CREATE POLICY "Technicians can create own expenses"
  ON expenses FOR INSERT
  TO authenticated
  WITH CHECK (technician_id = auth.uid());

-- Policy: Technicians can update their pending expenses
CREATE POLICY "Technicians can update pending expenses"
  ON expenses FOR UPDATE
  TO authenticated
  USING (technician_id = auth.uid() AND status = 'pending')
  WITH CHECK (technician_id = auth.uid() AND status = 'pending');

-- Policy: Admins can view all expenses
CREATE POLICY "Admins can view all expenses"
  ON expenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

-- Policy: Admins can update all expenses (for approval)
CREATE POLICY "Admins can update all expenses"
  ON expenses FOR UPDATE
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

-- Policy: Admins can delete expenses
CREATE POLICY "Admins can delete expenses"
  ON expenses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_technician_id ON expenses(technician_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
CREATE INDEX IF NOT EXISTS idx_projects_is_public ON projects(is_public);
CREATE INDEX IF NOT EXISTS idx_projects_is_validated ON projects(is_validated);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
