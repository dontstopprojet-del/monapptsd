/*
  # Fix Admin Quote Access with SECURITY DEFINER Function

  ## Problem
  The current "admin_select_all_quotes" policy uses a subquery to check if the user is admin/office:
  ```sql
  EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office'))
  ```
  This subquery triggers RLS policies on app_users which can cause performance issues or failures.

  ## Solution
  1. Create a SECURITY DEFINER function that bypasses RLS to check user role
  2. Update the quote_requests policies to use this function
  3. This ensures reliable and fast role checking without RLS complications

  ## Changes
  - Create `is_admin_or_office()` function with SECURITY DEFINER
  - Update admin SELECT policy to use this function
  - Update admin UPDATE policy to use this function
  - Add admin DELETE policy using this function

  ## Security
  - Function is SECURITY DEFINER but only returns boolean
  - No data leakage, just role verification
  - Maintains security while improving reliability
*/

-- Create a SECURITY DEFINER function to check if current user is admin or office
-- This bypasses RLS and provides reliable role checking
CREATE OR REPLACE FUNCTION is_admin_or_office()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  -- Get the role of the current authenticated user
  SELECT role INTO user_role
  FROM app_users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Return true if user is admin or office
  RETURN user_role IN ('admin', 'office');
END;
$$;

-- Drop existing admin policies on quote_requests
DROP POLICY IF EXISTS "admin_select_all_quotes" ON quote_requests;
DROP POLICY IF EXISTS "admin_update_all_quotes" ON quote_requests;
DROP POLICY IF EXISTS "admin_delete_quotes" ON quote_requests;

-- Create new policies using the SECURITY DEFINER function
-- Policy 1: Admins and office staff can SELECT all quotes
CREATE POLICY "admin_select_all_quotes"
  ON quote_requests FOR SELECT
  TO authenticated
  USING (is_admin_or_office());

-- Policy 2: Admins and office staff can UPDATE all quotes
CREATE POLICY "admin_update_all_quotes"
  ON quote_requests FOR UPDATE
  TO authenticated
  USING (is_admin_or_office())
  WITH CHECK (is_admin_or_office());

-- Policy 3: Admins and office staff can DELETE quotes (for cleanup)
CREATE POLICY "admin_delete_quotes"
  ON quote_requests FOR DELETE
  TO authenticated
  USING (is_admin_or_office());
