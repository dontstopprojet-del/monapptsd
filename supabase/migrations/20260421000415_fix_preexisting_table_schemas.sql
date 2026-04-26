/*
  # Fix pre-existing tables with mismatched schemas
  
  Some tables existed before our migrations with different column names.
  Adding missing columns to make them compatible.
*/

-- shared_locations: add user_id, shared_with
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_locations' AND column_name = 'user_id') THEN
    ALTER TABLE shared_locations ADD COLUMN user_id uuid REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_locations' AND column_name = 'shared_with') THEN
    ALTER TABLE shared_locations ADD COLUMN shared_with uuid REFERENCES app_users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shared_locations' AND column_name = 'created_at') THEN
    ALTER TABLE shared_locations ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- legal_signatures: add user_id, signature_data, created_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_signatures' AND column_name = 'user_id') THEN
    ALTER TABLE legal_signatures ADD COLUMN user_id uuid REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_signatures' AND column_name = 'signature_data') THEN
    ALTER TABLE legal_signatures ADD COLUMN signature_data text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'legal_signatures' AND column_name = 'created_at') THEN
    ALTER TABLE legal_signatures ADD COLUMN created_at timestamptz DEFAULT now();
  END IF;
END $$;

-- mission_trips: add user_id, destination, start_date, end_date, purpose, status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mission_trips' AND column_name = 'user_id') THEN
    ALTER TABLE mission_trips ADD COLUMN user_id uuid REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mission_trips' AND column_name = 'destination') THEN
    ALTER TABLE mission_trips ADD COLUMN destination text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'mission_trips' AND column_name = 'purpose') THEN
    ALTER TABLE mission_trips ADD COLUMN purpose text;
  END IF;
END $$;

-- worksite_completions: add completed_by, chantier_id, completion_date
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worksite_completions' AND column_name = 'completed_by') THEN
    ALTER TABLE worksite_completions ADD COLUMN completed_by uuid REFERENCES app_users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worksite_completions' AND column_name = 'chantier_id') THEN
    ALTER TABLE worksite_completions ADD COLUMN chantier_id uuid REFERENCES chantiers(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'worksite_completions' AND column_name = 'completion_date') THEN
    ALTER TABLE worksite_completions ADD COLUMN completion_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- project_photos: add uploaded_by, caption
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_photos' AND column_name = 'uploaded_by') THEN
    ALTER TABLE project_photos ADD COLUMN uploaded_by uuid REFERENCES app_users(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_photos' AND column_name = 'caption') THEN
    ALTER TABLE project_photos ADD COLUMN caption text;
  END IF;
END $$;

-- work_session_events: add session_id if missing
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'work_session_events' AND column_name = 'session_id') THEN
    ALTER TABLE work_session_events ADD COLUMN session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE;
  END IF;
END $$;