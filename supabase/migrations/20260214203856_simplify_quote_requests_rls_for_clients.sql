/*
  # Simplify Quote Requests RLS for Client Access
  
  ## Summary
  This migration simplifies and fixes RLS policies on quote_requests to ensure
  authenticated clients can create and view their own quotes without issues.
  
  ## Changes
  
  1. **Remove all existing policies** to start completely fresh
  2. **Create simplified, tested policies:**
     - Anonymous users: Can INSERT quotes (no user_id required)
     - Authenticated users: Can INSERT quotes (with their user_id)
     - Authenticated users: Can SELECT their own quotes (user_id = auth.uid())
     - Admins/office: Can SELECT all quotes
     - Admins/office: Can UPDATE any quote
     - Users: Can UPDATE their own quotes
  
  ## Security
  - Clients see only their own quotes
  - Admins see all quotes
  - Public tracking is removed for security (will be re-added in a dedicated component)
  
  ## Testing
  This migration has been designed to ensure clients can:
  1. Create quotes while logged in
  2. View only their own quotes
  3. Update their own quotes (e.g., to cancel)
*/

-- Step 1: Drop all existing policies
DO $$ 
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'quote_requests'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON quote_requests', policy_record.policyname);
    END LOOP;
END $$;

-- Step 2: Create simple, clear INSERT policies

-- Allow anonymous users to create quotes (user_id will be null)
CREATE POLICY "anon_insert_quotes"
  ON quote_requests FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow authenticated users to create quotes with their user_id
CREATE POLICY "auth_insert_quotes"
  ON quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR user_id IS NULL
  );

-- Step 3: Create SELECT policies

-- Authenticated users can view their own quotes
CREATE POLICY "auth_select_own_quotes"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins and office staff can view all quotes
CREATE POLICY "admin_select_all_quotes"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Step 4: Create UPDATE policies

-- Authenticated users can update their own quotes
CREATE POLICY "auth_update_own_quotes"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins and office staff can update all quotes
CREATE POLICY "admin_update_all_quotes"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );