/*
  # Backfill missing profiles, technicians, clients, and user status

  1. Changes
    - Add unique constraint on clients.profile_id for ON CONFLICT support
    - Create profiles for existing app_users (tech/client) that are missing them
    - Create technician entries for tech users missing them
    - Create client entries for client users missing them
    - Create user_real_time_status entries for all users missing them

  2. Notes
    - These records failed to create due to the old profiles FK bug
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clients_profile_id_key'
  ) THEN
    ALTER TABLE clients ADD CONSTRAINT clients_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

INSERT INTO profiles (id, full_name, phone, role)
SELECT au.id, au.name, au.phone, au.role
FROM app_users au
WHERE au.role IN ('tech', 'client')
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO technicians (profile_id, role_level, status, satisfaction_rate, total_revenue, contract_date)
SELECT au.id, 'Tech', 'Dispo', 100, 0, COALESCE(au.contract_date, CURRENT_DATE)
FROM app_users au
WHERE au.role = 'tech'
  AND NOT EXISTS (SELECT 1 FROM technicians t WHERE t.profile_id = au.id)
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO clients (profile_id, location, total_interventions, total_spent, badge, contract_date)
SELECT au.id, NULL, 0, 0, 'regular', COALESCE(au.contract_date, CURRENT_DATE)
FROM app_users au
WHERE au.role = 'client'
  AND NOT EXISTS (SELECT 1 FROM clients c WHERE c.profile_id = au.id)
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO user_real_time_status (user_id, status, last_updated)
SELECT au.id, 'offline', NOW()
FROM app_users au
WHERE NOT EXISTS (SELECT 1 FROM user_real_time_status s WHERE s.user_id = au.id)
ON CONFLICT (user_id) DO NOTHING;
