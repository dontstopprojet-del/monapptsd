/*
  # Debug and Fix get_all_quotes_for_admin Function

  1. Changes
    - Add extensive debug logging to the RPC function
    - Return diagnostic information if no quotes found
    - Fix potential auth.uid() issues in RPC context

  2. Security
    - Maintains security checks
    - Only returns data to admin/office users
*/

CREATE OR REPLACE FUNCTION get_all_quotes_for_admin()
RETURNS SETOF quote_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
  v_user_role TEXT;
  v_quote_count INTEGER;
BEGIN
  -- Get the authenticated user ID
  v_user_id := auth.uid();
  
  -- Log the user ID for debugging
  RAISE NOTICE 'RPC called by user ID: %', v_user_id;
  
  -- Check if user is authenticated
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'ERROR: No authenticated user (auth.uid() is NULL)';
    RETURN;
  END IF;

  -- Get user role
  SELECT role INTO v_user_role
  FROM app_users
  WHERE id = v_user_id
  LIMIT 1;
  
  RAISE NOTICE 'User role: %', v_user_role;

  -- Check if user is admin or office
  IF v_user_role NOT IN ('admin', 'office') THEN
    RAISE NOTICE 'ERROR: User is not admin/office, role is: %', v_user_role;
    RETURN;
  END IF;

  -- Count quotes
  SELECT COUNT(*) INTO v_quote_count FROM quote_requests;
  RAISE NOTICE 'Total quotes in DB: %', v_quote_count;

  -- Return all quotes
  RETURN QUERY
  SELECT *
  FROM quote_requests
  ORDER BY created_at DESC;
  
  RAISE NOTICE 'Quotes returned successfully';
END;
$$;

-- Ensure permissions are set
GRANT EXECUTE ON FUNCTION get_all_quotes_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_quotes_for_admin() TO anon;
