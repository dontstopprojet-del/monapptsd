/*
  # Part 6b: Remaining functions that had conflicts
*/

-- check_communication_permission
CREATE FUNCTION check_communication_permission(p_from_user uuid, p_to_user uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_role text;
  v_to_role text;
BEGIN
  SELECT role INTO v_from_role FROM app_users WHERE id = p_from_user;
  SELECT role INTO v_to_role FROM app_users WHERE id = p_to_user;
  
  IF v_from_role = 'admin' OR v_to_role = 'admin' THEN RETURN true; END IF;
  IF v_from_role = 'office' OR v_to_role = 'office' THEN RETURN true; END IF;
  IF v_from_role = 'tech' AND v_to_role = 'tech' THEN RETURN true; END IF;
  IF v_from_role = 'client' AND v_to_role IN ('admin', 'office') THEN RETURN true; END IF;
  IF v_from_role IN ('admin', 'office') AND v_to_role = 'client' THEN RETURN true; END IF;
  
  RETURN false;
END;
$$;

-- get_allowed_contacts
CREATE FUNCTION get_allowed_contacts(p_user_id uuid)
RETURNS SETOF app_users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM app_users WHERE id = p_user_id;
  
  IF v_role = 'admin' THEN
    RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id;
  ELSIF v_role = 'office' THEN
    RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id AND role IN ('admin', 'office', 'tech');
  ELSIF v_role = 'tech' THEN
    RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id AND role IN ('admin', 'office', 'tech');
  ELSIF v_role = 'client' THEN
    RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id AND role IN ('admin', 'office');
  END IF;
END;
$$;
