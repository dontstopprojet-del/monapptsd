/*
  # Secure Anonymous RLS Policies
  
  ## Summary
  This migration removes overly permissive anonymous access to sensitive tables
  and ensures only necessary data is publicly accessible.
  
  ## Security Changes
  
  ### Tables with Anonymous Access Removed:
  - **app_users**: Remove anonymous INSERT/UPDATE/DELETE access
    - Anonymous users should NOT be able to create or modify user accounts
    - Only authenticated users can manage their own profiles
  
  ### Tables with Read-Only Anonymous Access (Required for Public Features):
  - **chantiers**: Anonymous SELECT for validated and public projects only
  - **contact_messages**: Anonymous INSERT only (for contact form)
  - **quote_requests**: Anonymous INSERT only (for quote request form)
  
  ### Tables That Should Remain Private:
  - All other tables require authentication
  
  ## Important Notes
  1. **Data Protection**: Prevents unauthorized account creation and data manipulation
  2. **Public Features**: Maintains necessary access for visitor homepage and contact forms
  3. **Security First**: All sensitive operations require authentication
*/

-- Drop overly permissive anonymous policies on app_users
DROP POLICY IF EXISTS "Enable anonymous access for app_users" ON app_users;
DROP POLICY IF EXISTS "Allow anonymous insert for app_users" ON app_users;
DROP POLICY IF EXISTS "Allow anonymous update for app_users" ON app_users;
DROP POLICY IF EXISTS "Allow anonymous delete for app_users" ON app_users;
DROP POLICY IF EXISTS "Allow anonymous select for app_users" ON app_users;

-- app_users: Only authenticated users can manage their own profiles
CREATE POLICY "Users can view own profile"
  ON app_users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON app_users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Admins can view all users"
  ON app_users FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert users"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update all users"
  ON app_users FOR UPDATE
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

CREATE POLICY "Admins can delete users"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

-- contact_messages: Allow anonymous INSERT only (for public contact form)
DROP POLICY IF EXISTS "Enable anonymous insert for contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Allow all access to contact_messages" ON contact_messages;

CREATE POLICY "Anonymous can submit contact messages"
  ON contact_messages FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can view contact messages"
  ON contact_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update contact messages"
  ON contact_messages FOR UPDATE
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

-- quote_requests: Allow anonymous INSERT only (for public quote request form)
DROP POLICY IF EXISTS "Enable anonymous insert for quote_requests" ON quote_requests;
DROP POLICY IF EXISTS "Allow all access to quote_requests" ON quote_requests;

CREATE POLICY "Anonymous can submit quote requests"
  ON quote_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can view quote requests"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid() AND app_users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update quote requests"
  ON quote_requests FOR UPDATE
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

-- Ensure chantiers anonymous policy is properly set (already done in previous migration)
-- Just verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chantiers' 
    AND policyname = 'Public can view validated public projects'
  ) THEN
    CREATE POLICY "Public can view validated public projects"
      ON chantiers FOR SELECT
      TO anon
      USING (is_validated = true AND is_public = true);
  END IF;
END $$;

-- Remove any overly permissive policies on other sensitive tables
DROP POLICY IF EXISTS "Enable anonymous access" ON quotes;
DROP POLICY IF EXISTS "Enable anonymous access" ON invoices;
DROP POLICY IF EXISTS "Enable anonymous access" ON expenses;
DROP POLICY IF EXISTS "Enable anonymous access" ON stock_items;
DROP POLICY IF EXISTS "Enable anonymous access" ON stock_movements;
DROP POLICY IF EXISTS "Enable anonymous access" ON admin_settings;
DROP POLICY IF EXISTS "Enable anonymous access" ON messages;
DROP POLICY IF EXISTS "Enable anonymous access" ON conversations;
DROP POLICY IF EXISTS "Enable anonymous access" ON notifications;
