/*
  # Part 6: All database functions

  1. Core functions for signup, profile creation, triggers
  2. Communication permission functions
  3. Quote/invoice generation functions
  4. Update timestamp functions
  5. Stock sync functions
*/

-- Drop conflicting functions first
DROP FUNCTION IF EXISTS generate_tracking_number() CASCADE;
DROP FUNCTION IF EXISTS set_tracking_number() CASCADE;
DROP FUNCTION IF EXISTS set_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS check_communication_permission(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_allowed_contacts(uuid) CASCADE;

-- create_user_profile
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id uuid, p_email text, p_name text, p_role text,
  p_phone text DEFAULT NULL, p_date_of_birth date DEFAULT NULL,
  p_contract_signature_date date DEFAULT NULL, p_marital_status text DEFAULT NULL,
  p_contract_number text DEFAULT NULL, p_echelon text DEFAULT NULL,
  p_status text DEFAULT NULL, p_office_position text DEFAULT NULL,
  p_city text DEFAULT NULL, p_created_date text DEFAULT NULL,
  p_mad text DEFAULT NULL, p_creation_location text DEFAULT NULL,
  p_district text DEFAULT NULL, p_postal_code text DEFAULT NULL
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

-- handle_new_app_user
CREATE OR REPLACE FUNCTION handle_new_app_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_rec RECORD;
BEGIN
  IF NEW.role IN ('tech', 'client') THEN
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (NEW.id, NEW.name, NEW.phone, NEW.role)
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name, phone = EXCLUDED.phone, role = EXCLUDED.role;

    IF NEW.role = 'tech' THEN
      INSERT INTO public.technicians (profile_id, role_level, status, satisfaction_rate, total_revenue, contract_date)
      VALUES (NEW.id, 'Tech', 'Dispo', 100, 0, COALESCE(NEW.contract_date, CURRENT_DATE))
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;

    IF NEW.role = 'client' THEN
      INSERT INTO public.clients (profile_id, location, total_interventions, total_spent, badge, contract_date)
      VALUES (NEW.id, NULL, 0, 0, 'regular', COALESCE(NEW.contract_date, CURRENT_DATE))
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.user_real_time_status (user_id, status, last_updated)
  VALUES (NEW.id, 'offline', NOW())
  ON CONFLICT (user_id) DO NOTHING;

  FOR admin_rec IN SELECT id FROM public.app_users WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_alerts (recipient_id, alert_type, title, message, created_by, is_read)
    VALUES (admin_rec.id, 'general', 'Nouveau compte cree',
      'Un nouveau compte a ete cree : ' || NEW.name || ' (' || NEW.role || ')', NEW.id, false);
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.trigger_error_log (trigger_name, error_message, error_detail, user_id, user_email)
    VALUES ('handle_new_app_user', SQLERRM, SQLSTATE, NEW.id, NEW.email);
    RETURN NEW;
END;
$function$;

-- initialize_user_status
CREATE OR REPLACE FUNCTION initialize_user_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_real_time_status (user_id, status, last_updated) VALUES (NEW.id, 'offline', NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

-- sync_technician_profile
CREATE OR REPLACE FUNCTION sync_technician_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.role = 'tech' THEN
    INSERT INTO technicians (profile_id, role_level, status, satisfaction_rate, total_revenue, contract_date)
    VALUES (NEW.id, 'Tech', 'Dispo', 100, 0, COALESCE(NEW.contract_date, CURRENT_DATE))
    ON CONFLICT (profile_id) DO NOTHING;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END;
$$;

-- check_communication_permission
CREATE FUNCTION check_communication_permission(p_from_user uuid, p_to_user uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_from_role text; v_to_role text;
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
RETURNS SETOF app_users LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_role text;
BEGIN
  SELECT role INTO v_role FROM app_users WHERE id = p_user_id;
  IF v_role = 'admin' THEN RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id;
  ELSIF v_role = 'office' THEN RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id AND role IN ('admin', 'office', 'tech');
  ELSIF v_role = 'tech' THEN RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id AND role IN ('admin', 'office', 'tech');
  ELSIF v_role = 'client' THEN RETURN QUERY SELECT * FROM app_users WHERE id != p_user_id AND role IN ('admin', 'office');
  END IF;
END;
$$;

-- generate_tracking_number (trigger)
CREATE FUNCTION generate_tracking_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_number IS NULL THEN
    NEW.tracking_number := 'TSD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- generate_invoice_number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN 'FAC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
END;
$$;

-- set_tracking_number
CREATE FUNCTION set_tracking_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.tracking_number IS NULL THEN
    NEW.tracking_number := 'TSD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- set_invoice_number
CREATE FUNCTION set_invoice_number()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

-- accept_quote
CREATE OR REPLACE FUNCTION accept_quote(quote_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE quote_requests SET status = 'accepted', accepted_at = now(), updated_at = now() WHERE id = quote_id;
END;
$$;

-- reject_quote
CREATE OR REPLACE FUNCTION reject_quote(quote_id uuid, reason text DEFAULT '')
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE quote_requests SET status = 'rejected', rejected_at = now(), rejected_reason = reason, updated_at = now() WHERE id = quote_id;
END;
$$;

-- get_all_quotes_for_admin
CREATE OR REPLACE FUNCTION get_all_quotes_for_admin()
RETURNS SETOF quote_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF is_admin_or_office() THEN
    RETURN QUERY SELECT * FROM quote_requests ORDER BY created_at DESC;
  ELSE
    RETURN;
  END IF;
END;
$$;

-- update_conversation_last_message
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- update_updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- update_quote_updated_at
CREATE OR REPLACE FUNCTION update_quote_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- update_quote_request_timestamp
CREATE OR REPLACE FUNCTION update_quote_request_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- update_user_status_timestamp
CREATE OR REPLACE FUNCTION update_user_status_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.last_updated = NOW(); RETURN NEW; END; $$;

-- update_contrats_maintenance_updated_at
CREATE OR REPLACE FUNCTION update_contrats_maintenance_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- update_installations_updated_at
CREATE OR REPLACE FUNCTION update_installations_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- update_urgences_updated_at
CREATE OR REPLACE FUNCTION update_urgences_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- update_visites_contrat_updated_at
CREATE OR REPLACE FUNCTION update_visites_contrat_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- update_stock_items_updated_at
CREATE OR REPLACE FUNCTION update_stock_items_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

-- sync_stock_on_movement_insert
CREATE OR REPLACE FUNCTION sync_stock_on_movement_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.movement_type = 'in' THEN
    UPDATE stock_items SET quantity = quantity + NEW.quantity, updated_at = now() WHERE id = NEW.stock_item_id;
  ELSIF NEW.movement_type = 'out' THEN
    UPDATE stock_items SET quantity = GREATEST(quantity - NEW.quantity, 0), updated_at = now() WHERE id = NEW.stock_item_id;
  END IF;
  RETURN NEW;
END;
$$;

-- sync_stock_on_movement_delete
CREATE OR REPLACE FUNCTION sync_stock_on_movement_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD.movement_type = 'in' THEN
    UPDATE stock_items SET quantity = GREATEST(quantity - OLD.quantity, 0), updated_at = now() WHERE id = OLD.stock_item_id;
  ELSIF OLD.movement_type = 'out' THEN
    UPDATE stock_items SET quantity = quantity + OLD.quantity, updated_at = now() WHERE id = OLD.stock_item_id;
  END IF;
  RETURN OLD;
END;
$$;