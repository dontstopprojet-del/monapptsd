/*
  # Fix user profile creation on new app_user

  1. Changes
    - Remove FK from profiles.id -> auth.users.id (app uses app_users, not auth.users)
    - Add FK from profiles.id -> app_users.id (correct reference)
    - Fix handle_new_app_user() to use NEW.id as profile ID instead of gen_random_uuid()
    - This ensures the profile is properly linked to the app_user

  2. Notes
    - The old FK caused silent failures because app_users.id is not in auth.users
    - All new tech/client users created via app_users will now get proper profiles
    - Also initializes user_real_time_status for new users
*/

ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_id_app_users_fkey'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_id_app_users_fkey
      FOREIGN KEY (id) REFERENCES app_users(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION handle_new_app_user()
RETURNS TRIGGER AS $$
DECLARE
  admin_rec RECORD;
BEGIN
  IF NEW.role IN ('tech', 'client') THEN
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
      NEW.id,
      NEW.name,
      NEW.phone,
      NEW.role
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role = EXCLUDED.role;

    IF NEW.role = 'tech' THEN
      INSERT INTO public.technicians (
        profile_id,
        role_level,
        status,
        satisfaction_rate,
        total_revenue,
        contract_date
      ) VALUES (
        NEW.id,
        'Tech',
        'Dispo',
        100,
        0,
        COALESCE(NEW.contract_date, CURRENT_DATE)
      )
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;

    IF NEW.role = 'client' THEN
      INSERT INTO public.clients (
        profile_id,
        location,
        total_interventions,
        total_spent,
        badge,
        contract_date
      ) VALUES (
        NEW.id,
        NULL,
        0,
        0,
        'regular',
        COALESCE(NEW.contract_date, CURRENT_DATE)
      )
      ON CONFLICT (profile_id) DO NOTHING;
    END IF;
  END IF;

  INSERT INTO public.user_real_time_status (user_id, status, last_updated)
  VALUES (NEW.id, 'offline', NOW())
  ON CONFLICT (user_id) DO NOTHING;

  FOR admin_rec IN
    SELECT id FROM public.app_users WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_alerts (
      recipient_id,
      alert_type,
      title,
      message,
      created_by,
      is_read
    ) VALUES (
      admin_rec.id,
      'general',
      'Nouveau compte créé',
      'Un nouveau compte a été créé : ' || NEW.name || ' (' || NEW.role || ')',
      NEW.id,
      false
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    INSERT INTO public.trigger_error_log (
      trigger_name,
      error_message,
      error_detail,
      user_id,
      user_email
    ) VALUES (
      'handle_new_app_user',
      SQLERRM,
      SQLSTATE,
      NEW.id,
      NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
