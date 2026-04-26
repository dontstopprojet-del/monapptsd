/*
  # Restore missing triggers and complete sync system

  1. Restored Triggers
    - `trigger_auto_create_chantier` on `quote_requests` - auto-creates chantier when quote is accepted
    - `trigger_sync_technician` on `app_users` - syncs technician profile when role changes
    - `trigger_auto_assign_tech` on `chantiers` - notifies admins when new chantier needs assignment

  2. Functions Restored
    - `auto_create_chantier_from_accepted_quote()` - creates chantier from accepted quote
    - `sync_technician_profile()` - manages technician table from app_users role
    - `auto_assign_technician_to_chantier()` - sends notification for unassigned chantiers

  3. Important Notes
    - All functions use SECURITY DEFINER for proper RLS bypass
    - All triggers use IF NOT EXISTS for idempotent application
    - Existing data is backfilled where needed
*/

-- 1. Restore auto_create_chantier_from_accepted_quote function
CREATE OR REPLACE FUNCTION auto_create_chantier_from_accepted_quote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_chantier_id uuid;
BEGIN
  IF NEW.status = 'accepted' AND (OLD.status IS DISTINCT FROM 'accepted') AND NEW.chantier_id IS NULL THEN
    INSERT INTO chantiers (title, client_name, location, status, progress, quote_request_id)
    VALUES (
      COALESCE(NEW.service_type, 'Chantier'),
      COALESCE(NEW.client_name, NEW.full_name, 'Client'),
      COALESCE(NEW.address, NEW.location, 'A definir'),
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

-- 2. Restore sync_technician_profile function
CREATE OR REPLACE FUNCTION sync_technician_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'technician' THEN
    INSERT INTO technicians (profile_id, role_level, status, color)
    VALUES (
      NEW.id,
      'junior',
      'Dispo',
      '#' || substr(md5(random()::text), 1, 6)
    )
    ON CONFLICT (profile_id) DO NOTHING;
  ELSIF OLD IS NOT NULL AND OLD.role = 'technician' AND NEW.role <> 'technician' THEN
    UPDATE technicians SET status = 'Inactif' WHERE profile_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. Restore auto_assign_technician_to_chantier function
CREATE OR REPLACE FUNCTION auto_assign_technician_to_chantier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.technician_id IS NULL AND NEW.status = 'planned' THEN
    INSERT INTO notifications (user_id, title, message, type)
    SELECT au.id, 'Chantier a assigner',
      'Le chantier "' || NEW.title || '" necessite un technicien.',
      'warning'
    FROM app_users au
    WHERE au.role IN ('admin', 'office');
  END IF;
  RETURN NEW;
END;
$$;

-- 4. Create missing triggers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_auto_create_chantier'
    AND event_object_table = 'quote_requests'
    AND trigger_schema = 'public'
  ) THEN
    CREATE TRIGGER trigger_auto_create_chantier
      AFTER UPDATE ON quote_requests
      FOR EACH ROW
      WHEN (OLD.status IS DISTINCT FROM NEW.status OR NEW.chantier_id IS NULL)
      EXECUTE FUNCTION auto_create_chantier_from_accepted_quote();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_sync_technician'
    AND event_object_table = 'app_users'
    AND trigger_schema = 'public'
  ) THEN
    CREATE TRIGGER trigger_sync_technician
      AFTER INSERT OR UPDATE OF role ON app_users
      FOR EACH ROW
      EXECUTE FUNCTION sync_technician_profile();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'trigger_auto_assign_tech'
    AND event_object_table = 'chantiers'
    AND trigger_schema = 'public'
  ) THEN
    CREATE TRIGGER trigger_auto_assign_tech
      AFTER INSERT ON chantiers
      FOR EACH ROW
      WHEN (NEW.technician_id IS NULL AND NEW.status = 'planned')
      EXECUTE FUNCTION auto_assign_technician_to_chantier();
  END IF;
END $$;

-- 5. Backfill: ensure all technician-role app_users have technician entries
INSERT INTO technicians (profile_id, role_level, status, color)
SELECT au.id, 'junior', 'Dispo', '#' || substr(md5(random()::text), 1, 6)
FROM app_users au
WHERE au.role = 'technician'
AND NOT EXISTS (SELECT 1 FROM technicians t WHERE t.profile_id = au.id)
ON CONFLICT (profile_id) DO NOTHING;
