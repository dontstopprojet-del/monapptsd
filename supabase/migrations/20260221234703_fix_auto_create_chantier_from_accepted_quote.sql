/*
  # Fix auto-create chantier trigger for accepted quotes

  1. Problem
    - The trigger function referenced non-existent columns: client_name, full_name, location
    - The actual column names in quote_requests are: name, address
    - This caused accept_quote() to fail with "record new has no field client_name"

  2. Fix
    - Use correct column names: NEW.name instead of NEW.client_name/NEW.full_name
    - Use NEW.address instead of NEW.location
    - Link chantier to client via client_id = NEW.user_id
    - Keep the auto-notification to admins
*/

CREATE OR REPLACE FUNCTION auto_create_chantier_from_accepted_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  new_chantier_id uuid;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') AND NEW.chantier_id IS NULL THEN
    INSERT INTO chantiers (title, client_name, client_id, location, status, progress, quote_request_id)
    VALUES (
      COALESCE(NEW.service_type, 'Chantier'),
      COALESCE(NEW.name, 'Client'),
      NEW.user_id,
      COALESCE(NEW.address, 'A definir'),
      'planned',
      0,
      NEW.id
    )
    RETURNING id INTO new_chantier_id;

    UPDATE quote_requests SET chantier_id = new_chantier_id WHERE id = NEW.id;

    INSERT INTO notifications (user_id, title, message, type)
    SELECT au.id, 'Nouveau chantier cree',
      'Un chantier a ete automatiquement cree depuis le devis accepte: ' || COALESCE(NEW.service_type, 'Chantier'),
      'info'
    FROM app_users au
    WHERE au.role IN ('admin', 'office');
  END IF;
  RETURN NEW;
END;
$$;
