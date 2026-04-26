/*
  # Restore missing dependent records after operational data reset

  1. Problem
    - A previous data reset (TRUNCATE CASCADE) cleared technicians, clients,
      user_real_time_status records
    - This left tech/client users unable to fully access their dashboards
    - Missing records cause the app to not load chantiers, invoices, etc.

  2. Fix
    - Re-insert missing `technicians` records for all tech-role users
    - Re-insert missing `clients` records for all client-role users
    - Re-insert missing `profiles` records for tech/client/admin users
      (profiles table has a check constraint limiting roles to client/tech/admin)
    - Re-insert missing `user_real_time_status` for all users

  3. Tables affected
    - technicians (INSERT for missing tech users)
    - clients (INSERT for missing client users)
    - profiles (INSERT for missing tech/client/admin users)
    - user_real_time_status (INSERT for missing users)

  4. Safety
    - All inserts use ON CONFLICT DO NOTHING to avoid duplicates
    - No data is modified or deleted
*/

INSERT INTO public.technicians (profile_id, role_level, status, satisfaction_rate, total_revenue, contract_date)
SELECT au.id, 'Tech', 'Dispo', 100, 0, COALESCE(au.contract_date, CURRENT_DATE)
FROM public.app_users au
WHERE au.role = 'tech'
  AND NOT EXISTS (SELECT 1 FROM public.technicians t WHERE t.profile_id = au.id)
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.clients (profile_id, location, total_interventions, total_spent, badge, contract_date)
SELECT au.id, NULL, 0, 0, 'regular', COALESCE(au.contract_date, CURRENT_DATE)
FROM public.app_users au
WHERE au.role = 'client'
  AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.profile_id = au.id)
ON CONFLICT (profile_id) DO NOTHING;

INSERT INTO public.profiles (id, full_name, phone, role)
SELECT au.id, au.name, au.phone, au.role
FROM public.app_users au
WHERE au.role IN ('client', 'tech', 'admin')
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.user_real_time_status (user_id, status, last_updated)
SELECT au.id, 'offline', NOW()
FROM public.app_users au
WHERE NOT EXISTS (SELECT 1 FROM public.user_real_time_status urs WHERE urs.user_id = au.id)
ON CONFLICT (user_id) DO NOTHING;
