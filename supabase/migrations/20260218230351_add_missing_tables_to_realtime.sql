/*
  # Add missing tables to realtime publication

  1. Changes
    - Add `user_real_time_status` to realtime (live technician tracking)
    - Add `work_sessions` to realtime (active session tracking)
    - Add `work_session_events` to realtime (session events)
    - Add `conversations` to realtime (chat list updates)
    - Add `mission_trips` to realtime (GPS trip tracking)

  2. Notes
    - These tables were missing from the supabase_realtime publication
    - Without realtime, admin dashboard cannot see live updates from technicians
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_real_time_status'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE user_real_time_status;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'work_sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE work_sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'work_session_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE work_session_events;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'mission_trips'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE mission_trips;
  END IF;
END $$;
