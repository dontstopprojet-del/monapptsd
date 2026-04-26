/*
  # Fix initialize_user_status function

  1. Changes
    - Fix column names: `is_online` -> `status`, `last_seen` -> `last_updated`
    - The function was using columns that don't exist in `user_real_time_status`
    - This caused silent failures when creating new users
  
  2. Notes
    - The table uses `status` (text, default 'offline') not `is_online` (boolean)
    - The table uses `last_updated` (timestamptz) not `last_seen`
*/

CREATE OR REPLACE FUNCTION initialize_user_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_real_time_status (user_id, status, last_updated)
  VALUES (NEW.id, 'offline', NOW())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
