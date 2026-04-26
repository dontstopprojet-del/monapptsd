/*
  # Add RPC Function to Get All Quotes for Admin

  1. New Function
    - `get_all_quotes_for_admin()` - Returns all quotes if user is admin/office
    - Uses SECURITY DEFINER to bypass RLS
    - Checks user role before returning data

  2. Security
    - Verifies user is authenticated
    - Checks role is admin or office
    - Returns empty array if user is not authorized
*/

CREATE OR REPLACE FUNCTION get_all_quotes_for_admin()
RETURNS SETOF quote_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_role TEXT;
BEGIN
  -- Check if user is authenticated
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- Get user role
  SELECT role INTO v_user_role
  FROM app_users
  WHERE id = auth.uid()
  LIMIT 1;

  -- Check if user is admin or office
  IF v_user_role NOT IN ('admin', 'office') THEN
    RETURN;
  END IF;

  -- Return all quotes
  RETURN QUERY
  SELECT *
  FROM quote_requests
  ORDER BY created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_quotes_for_admin() TO authenticated;
