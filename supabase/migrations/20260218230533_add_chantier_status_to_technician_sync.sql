/*
  # Sync chantier status to technician status

  1. New Function
    - `sync_chantier_status_to_technician()` - When a chantier status changes:
      - To 'inProgress': set technician status to 'Mission'
      - To 'completed' or 'planned': check if tech has other active chantiers,
        if not, set status back to 'Dispo'

  2. New Trigger
    - `trigger_sync_chantier_status_to_tech` on chantiers (AFTER UPDATE OF status)

  3. Notes
    - Only fires when the status column actually changes
    - Checks for other active chantiers before setting back to 'Dispo'
    - Prevents technicians from appearing available when actively on a mission
*/

CREATE OR REPLACE FUNCTION sync_chantier_status_to_technician()
RETURNS TRIGGER AS $$
DECLARE
  active_count integer;
BEGIN
  IF NEW.technician_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'inProgress' THEN
      UPDATE technicians
      SET status = 'Mission'
      WHERE id = NEW.technician_id;

    ELSIF NEW.status IN ('completed', 'planned') THEN
      SELECT COUNT(*) INTO active_count
      FROM chantiers
      WHERE technician_id = NEW.technician_id
        AND status = 'inProgress'
        AND id != NEW.id;

      IF active_count = 0 THEN
        UPDATE technicians
        SET status = 'Dispo'
        WHERE id = NEW.technician_id;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_sync_chantier_status_to_tech'
  ) THEN
    CREATE TRIGGER trigger_sync_chantier_status_to_tech
      AFTER UPDATE OF status
      ON chantiers
      FOR EACH ROW
      EXECUTE FUNCTION sync_chantier_status_to_technician();
  END IF;
END $$;
