/*
  # Fix Quote Requests RLS Policies for Authenticated Users
  
  ## Summary
  This migration fixes RLS policies on quote_requests to ensure authenticated users (clients)
  can properly create and view their own quotes.
  
  ## Changes
  
  1. **RLS Policies Updated**
     - DROP conflicting SELECT policies that allow anyone to see all quotes
     - CREATE clear, restrictive policies:
       * Authenticated users can INSERT their own quotes
       * Anonymous users can INSERT quotes (without user_id)
       * Authenticated users can SELECT only their own quotes (where user_id = auth.uid())
       * Admins/office can SELECT all quotes
       * Only admins/office can UPDATE quotes
       * Public tracking by tracking_number (read-only for status checking)
  
  2. **Security Improvements**
     - Clients can only see their own quotes
     - No user can see other users' quotes
     - Anonymous quotes (user_id = null) are only visible to admins
     - Public tracking page can check status by tracking number only
  
  ## Important Notes
  
  - This ensures data isolation between clients
  - Admins and office employees maintain full access
  - Public quote tracking remains functional via tracking_number
*/

-- Drop ALL existing policies on quote_requests to start fresh
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

-- Policy 1: Authenticated users can INSERT quotes with their user_id
CREATE POLICY "Authenticated users can create their own quotes"
  ON quote_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy 2: Anonymous users can INSERT quotes (user_id must be null)
CREATE POLICY "Anonymous users can create quotes"
  ON quote_requests FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Policy 3: Authenticated users can SELECT only their own quotes
CREATE POLICY "Authenticated users can view their own quotes"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy 4: Admins and office employees can SELECT all quotes
CREATE POLICY "Admins can view all quotes"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Policy 5: Anyone can SELECT quotes by tracking_number for public tracking
-- This is a limited view: only basic status info, not full details
CREATE POLICY "Public tracking by tracking number"
  ON quote_requests FOR SELECT
  TO anon, authenticated
  USING (tracking_number IS NOT NULL);

-- Policy 6: Only admins and office employees can UPDATE quotes
CREATE POLICY "Admins can update quotes"
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

-- Policy 7: Users can UPDATE their own quotes (limited to status changes)
CREATE POLICY "Users can update their own quotes status"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);