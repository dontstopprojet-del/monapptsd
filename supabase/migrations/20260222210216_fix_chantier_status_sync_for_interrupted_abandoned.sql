/*
  # Fix chantier status sync for interrupted and abandoned statuses

  1. Modified Functions
    - `sync_chantier_status_to_technician` - Now properly handles 'interrupted' and 'abandoned' statuses
      - When status changes to 'interrupted' or 'abandoned', checks for other active chantiers
      - If no other active chantiers exist, sets technician status to 'Dispo'
      - Previously only handled 'inProgress', 'completed', and 'planned'

  2. Important Notes
    - This ensures technician availability is correctly updated for all status transitions
    - Maintains existing behavior for inProgress, completed, and planned statuses
*/

CREATE OR REPLACE FUNCTION sync_chantier_status_to_technician()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

    ELSIF NEW.status IN ('completed', 'planned', 'interrupted', 'abandoned') THEN
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
$$;
