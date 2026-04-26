/*
  # Create Stock Management System

  ## New Tables
  
  1. `stock_items`
    - `id` (uuid, primary key)
    - `name` (text, unique)
    - `category` (text: materiel, outillage, consommable, securite, autre)
    - `quantity` (integer)
    - `min_quantity` (integer, threshold for alerts)
    - `unit` (text: piece, kg, litre, metre, carton, paquet)
    - `unit_price` (numeric)
    - `supplier` (text, optional)
    - `notes` (text, optional)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
  
  2. `stock_movements`
    - `id` (uuid, primary key)
    - `stock_item_id` (uuid, references stock_items)
    - `movement_type` (text: in, out)
    - `quantity` (integer)
    - `reference` (text, optional: order number, project ref, etc.)
    - `notes` (text, optional)
    - `created_by` (uuid, references app_users)
    - `created_at` (timestamptz)

  ## Security
    - Enable RLS on stock_items table
    - Enable RLS on stock_movements table
    - Authenticated users can view stock items
    - Only admins can create/update/delete stock items
    - Authenticated users can create stock movements
    - All users can view stock movements history
*/

-- Create stock_items table
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('materiel', 'outillage', 'consommable', 'securite', 'autre')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity integer NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  unit text NOT NULL DEFAULT 'piece' CHECK (unit IN ('piece', 'kg', 'litre', 'metre', 'carton', 'paquet')),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  supplier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint on stock item name
CREATE UNIQUE INDEX IF NOT EXISTS stock_items_name_unique ON stock_items(LOWER(name));

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reference text,
  notes text,
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_items_quantity ON stock_items(quantity);
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_item ON stock_movements(stock_item_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON stock_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON stock_movements(created_at);

-- Enable RLS on stock_items
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view stock items
CREATE POLICY "Authenticated users can view stock items"
  ON stock_items FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Only admins can create stock items
CREATE POLICY "Admins can create stock items"
  ON stock_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

-- Policy: Only admins can update stock items
CREATE POLICY "Admins can update stock items"
  ON stock_items FOR UPDATE
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

-- Policy: Only admins can delete stock items
CREATE POLICY "Admins can delete stock items"
  ON stock_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

-- Enable RLS on stock_movements
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view stock movements
CREATE POLICY "Authenticated users can view stock movements"
  ON stock_movements FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can create stock movements
CREATE POLICY "Authenticated users can create stock movements"
  ON stock_movements FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Policy: Only admins can update stock movements
CREATE POLICY "Admins can update stock movements"
  ON stock_movements FOR UPDATE
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

-- Policy: Only admins can delete stock movements
CREATE POLICY "Admins can delete stock movements"
  ON stock_movements FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_stock_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_stock_items_updated_at ON stock_items;
CREATE TRIGGER trigger_update_stock_items_updated_at
  BEFORE UPDATE ON stock_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_items_updated_at();
