/*
  # Fix is_admin_or_office Function to Return FALSE Instead of NULL

  ## Problem
  The current is_admin_or_office() function returns NULL when:
  - auth.uid() is NULL (unauthenticated)
  - User is not found in app_users
  - User role is not admin or office
  
  When RLS policies check is_admin_or_office() and it returns NULL,
  the policy evaluates to FALSE, but NULL handling can cause issues.

  ## Solution
  Update the function to explicitly return FALSE instead of NULL:
  - Use COALESCE to handle NULL user_role
  - Explicitly return FALSE when auth.uid() is NULL
  - Return FALSE when user is not admin/office

  ## Impact
  - More predictable RLS policy behavior
  - Admin access to quotes will work correctly
  - Non-admin users will be correctly denied
*/

-- Drop and recreate the function with better NULL handling
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
  -- If no authenticated user, return FALSE immediately
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Get the role of the current authenticated user
  SELECT role INTO user_role
  FROM app_users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If user not found or role is NULL, return FALSE
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Return TRUE only if user is admin or office
  RETURN user_role IN ('admin', 'office');
END;
$$;