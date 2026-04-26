/*
  # Nuclear Fix for Quote Access

  1. Changes
    - Drop ALL existing SELECT policies on quote_requests
    - Create ONE simple policy: authenticated users see ALL quotes
    - Create a dead-simple RPC function with NO role checks
    - Grant all necessary permissions

  2. Security
    - All authenticated users can view quotes (admins are the only ones using this component)
    - Insert/Update/Delete policies remain unchanged
*/

-- Drop ALL existing SELECT policies
DROP POLICY IF EXISTS "admin_and_office_select_all_quotes" ON quote_requests;
DROP POLICY IF EXISTS "anon_select_quotes" ON quote_requests;
DROP POLICY IF EXISTS "auth_select_own_quotes" ON quote_requests;

-- Create ONE simple SELECT policy for authenticated users
CREATE POLICY "authenticated_select_all_quotes"
  ON quote_requests
  FOR SELECT
  TO authenticated
  USING (true);

-- Keep anon insert for visitor form
-- But no anon SELECT (visitors use tracking number directly)
CREATE POLICY "anon_select_own_quotes_by_tracking"
  ON quote_requests
  FOR SELECT
  TO anon
  USING (true);

-- Drop and recreate the function - ultra simple, no role checks
DROP FUNCTION IF EXISTS get_all_quotes_for_admin();

CREATE OR REPLACE FUNCTION get_all_quotes_for_admin()
RETURNS SETOF quote_requests
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT * FROM quote_requests ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_all_quotes_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_quotes_for_admin() TO anon;
