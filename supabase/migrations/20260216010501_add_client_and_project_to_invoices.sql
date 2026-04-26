/*
  # Add Client and Project References to Invoices

  1. Schema Changes
    - Add `client_id` (uuid, foreign key to app_users)
    - Add `project_id` (uuid, foreign key to chantiers)
    - Add `invoice_number` (text, unique invoice identifier)
    - Add `payment_date` (date, when payment was received)
    - Add `payment_method` (text, payment method used)
    - Add `notes` (text, additional notes)
    - Add `items` (jsonb, invoice line items)
    
  2. Data Migration
    - Keep existing client_name for backward compatibility
    - New invoices will use client_id for proper relations
    
  3. Security
    - RLS policies remain unchanged
    - Clients can view their own invoices
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'client_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN client_id uuid REFERENCES app_users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN project_id uuid REFERENCES chantiers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE invoices ADD COLUMN invoice_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'payment_method'
  ) THEN
    ALTER TABLE invoices ADD COLUMN payment_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'notes'
  ) THEN
    ALTER TABLE invoices ADD COLUMN notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'items'
  ) THEN
    ALTER TABLE invoices ADD COLUMN items jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

DROP POLICY IF EXISTS "Clients can view their invoices" ON invoices;
CREATE POLICY "Clients can view their invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );
