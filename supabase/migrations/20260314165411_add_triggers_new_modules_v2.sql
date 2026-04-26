/*
  # Add updated_at triggers for new module tables (v2)

  Uses the public.update_updated_at() function that already exists.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'installations_client_updated_at'
  ) THEN
    CREATE TRIGGER installations_client_updated_at
      BEFORE UPDATE ON installations_client
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'urgences_updated_at'
  ) THEN
    CREATE TRIGGER urgences_updated_at
      BEFORE UPDATE ON urgences
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;
