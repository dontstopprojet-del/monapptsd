/*
  # Restore bidirectional sync between planning and chantiers

  1. New Functions
    - `sync_chantier_to_planning()` - When a chantier's scheduled_date, scheduled_time, or technician_id changes,
      update or create the corresponding planning entry
    - `sync_planning_to_chantier()` - When a planning entry's scheduled_date or technician_id changes,
      update the corresponding chantier

  2. New Triggers
    - `trigger_sync_chantier_to_planning` on chantiers (AFTER INSERT OR UPDATE)
    - `trigger_sync_planning_to_chantier` on planning (AFTER INSERT OR UPDATE)

  3. Notes
    - Uses session variable `app.syncing` to prevent infinite trigger loops
    - Only syncs when relevant columns actually change
    - Safe: uses ON CONFLICT for upsert behavior
*/

CREATE OR REPLACE FUNCTION sync_chantier_to_planning()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.syncing', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.scheduled_date IS NOT NULL AND NEW.technician_id IS NOT NULL THEN
    PERFORM set_config('app.syncing', 'true', true);

    INSERT INTO planning (chantier_id, technician_id, scheduled_date, start_time, end_date)
    VALUES (
      NEW.id,
      NEW.technician_id,
      NEW.scheduled_date,
      COALESCE(NEW.scheduled_time, '08:00'),
      COALESCE(NEW.scheduled_date + interval '3 days', NEW.scheduled_date)
    )
    ON CONFLICT (id) DO NOTHING;

    UPDATE planning
    SET
      technician_id = NEW.technician_id,
      scheduled_date = NEW.scheduled_date,
      start_time = COALESCE(NEW.scheduled_time, start_time)
    WHERE chantier_id = NEW.id
      AND (
        technician_id IS DISTINCT FROM NEW.technician_id
        OR scheduled_date IS DISTINCT FROM NEW.scheduled_date
      );

    PERFORM set_config('app.syncing', 'false', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION sync_planning_to_chantier()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.syncing', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF NEW.chantier_id IS NOT NULL THEN
    PERFORM set_config('app.syncing', 'true', true);

    UPDATE chantiers
    SET
      technician_id = COALESCE(NEW.technician_id, technician_id),
      scheduled_date = COALESCE(NEW.scheduled_date, scheduled_date),
      scheduled_time = COALESCE(NEW.start_time, scheduled_time)
    WHERE id = NEW.chantier_id
      AND (
        technician_id IS DISTINCT FROM NEW.technician_id
        OR scheduled_date IS DISTINCT FROM NEW.scheduled_date
      );

    PERFORM set_config('app.syncing', 'false', true);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sync_chantier_to_planning'
  ) THEN
    CREATE TRIGGER trigger_sync_chantier_to_planning
      AFTER INSERT OR UPDATE OF scheduled_date, scheduled_time, technician_id
      ON chantiers
      FOR EACH ROW
      EXECUTE FUNCTION sync_chantier_to_planning();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sync_planning_to_chantier'
  ) THEN
    CREATE TRIGGER trigger_sync_planning_to_chantier
      AFTER INSERT OR UPDATE OF scheduled_date, technician_id
      ON planning
      FOR EACH ROW
      EXECUTE FUNCTION sync_planning_to_chantier();
  END IF;
END $$;
