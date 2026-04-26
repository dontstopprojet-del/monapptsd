/*
  # Refresh create_user_profile function

  1. Changes
    - Recreates the `create_user_profile` function with the same signature
    - Forces PostgREST schema cache to recognize the function
  
  2. Important Notes
    - No data changes, only function recreation
    - All 18 parameters preserved with same defaults
*/

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_role text,
  p_phone text DEFAULT NULL::text,
  p_date_of_birth date DEFAULT NULL::date,
  p_contract_signature_date date DEFAULT NULL::date,
  p_marital_status text DEFAULT NULL::text,
  p_contract_number text DEFAULT NULL::text,
  p_echelon text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_office_position text DEFAULT NULL::text,
  p_city text DEFAULT NULL::text,
  p_created_date text DEFAULT NULL::text,
  p_mad text DEFAULT NULL::text,
  p_creation_location text DEFAULT NULL::text,
  p_district text DEFAULT NULL::text,
  p_postal_code text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_result json;
  v_existing_profile RECORD;
BEGIN
  SELECT * INTO v_existing_profile FROM public.app_users WHERE email = p_email;

  IF v_existing_profile.id IS NOT NULL AND v_existing_profile.id != p_user_id THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_existing_profile.id) THEN
      DELETE FROM public.app_users WHERE id = v_existing_profile.id;
      INSERT INTO public.app_users (
        id, email, name, role, phone, date_of_birth,
        contract_signature_date, marital_status, contract_number,
        echelon, status, office_position, city, created_date,
        mad, creation_location, district, postal_code, created_at, updated_at
      ) VALUES (
        p_user_id, p_email, p_name, p_role, p_phone, p_date_of_birth,
        p_contract_signature_date, p_marital_status, p_contract_number,
        p_echelon, p_status, p_office_position, p_city, p_created_date,
        p_mad, p_creation_location, p_district, p_postal_code, now(), now()
      ) RETURNING to_json(app_users.*) INTO v_result;
      RETURN v_result;
    ELSE
      RAISE EXCEPTION 'Un compte avec cet email existe deja. Veuillez vous connecter.';
    END IF;
  END IF;

  INSERT INTO public.app_users (
    id, email, name, role, phone, date_of_birth,
    contract_signature_date, marital_status, contract_number,
    echelon, status, office_position, city, created_date,
    mad, creation_location, district, postal_code, created_at, updated_at
  ) VALUES (
    p_user_id, p_email, p_name, p_role, p_phone, p_date_of_birth,
    p_contract_signature_date, p_marital_status, p_contract_number,
    p_echelon, p_status, p_office_position, p_city, p_created_date,
    p_mad, p_creation_location, p_district, p_postal_code, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email, name = EXCLUDED.name, role = EXCLUDED.role,
    phone = EXCLUDED.phone, date_of_birth = EXCLUDED.date_of_birth,
    contract_signature_date = EXCLUDED.contract_signature_date,
    marital_status = EXCLUDED.marital_status, contract_number = EXCLUDED.contract_number,
    echelon = EXCLUDED.echelon, status = EXCLUDED.status,
    office_position = EXCLUDED.office_position, city = EXCLUDED.city,
    created_date = EXCLUDED.created_date, mad = EXCLUDED.mad,
    creation_location = EXCLUDED.creation_location, district = EXCLUDED.district,
    postal_code = EXCLUDED.postal_code, updated_at = now()
  RETURNING to_json(app_users.*) INTO v_result;

  RETURN v_result;
END;
$function$;

NOTIFY pgrst, 'reload schema';
