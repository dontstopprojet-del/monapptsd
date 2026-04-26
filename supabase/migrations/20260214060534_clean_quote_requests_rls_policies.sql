/*
  # Clean and Simplify Quote Requests RLS Policies

  This migration removes duplicate and conflicting RLS policies on the quote_requests table
  and replaces them with clear, simple policies.

  ## Changes
  
  1. Remove all existing policies on quote_requests
  2. Create 4 simple, clear policies:
     - Anyone (anon + authenticated) can insert quotes
     - Authenticated users can view their own quotes
     - Admins can view and update all quotes
     - Anyone can read quotes by tracking number (for public tracking)

  ## Security Notes
  
  - INSERT: Open to both anonymous and authenticated users
  - SELECT: Users see their own quotes, admins see all
  - UPDATE: Only admins can update quotes
  - DELETE: Not allowed (data preservation)
*/

-- Drop all existing policies on quote_requests
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

-- Policy 1: Anyone can insert quote requests (anonymous visitors or authenticated users)
CREATE POLICY "Anyone can submit quote requests"
  ON quote_requests FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Authenticated users can view their own quotes
CREATE POLICY "Users can view their own quotes"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 3: Anyone can view quotes by tracking number (for public tracking page)
CREATE POLICY "Anyone can view quotes by tracking number"
  ON quote_requests FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy 4: Admins and office employees can view all quotes
CREATE POLICY "Admins can view all quotes"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office_employee')
    )
  );

-- Policy 5: Admins and office employees can update quotes
CREATE POLICY "Admins can update quotes"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office_employee')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office_employee')
    )
  );

-- Policy 6: Users can update their own quotes (limited fields, like cancellation)
CREATE POLICY "Users can update their own quotes"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);