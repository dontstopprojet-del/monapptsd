/*
  # Fix mutable search_path on 6 public functions

  1. Changes
    - Sets search_path to 'public' on all 6 flagged functions
    - This prevents potential security issues where a malicious schema
      could shadow public tables/functions

  2. Functions fixed
    - sync_chantier_to_planning
    - sync_planning_to_chantier
    - sync_chantier_status_to_technician
    - update_user_status_timestamp
    - initialize_user_status
    - handle_new_app_user

  3. Security
    - Immutable search_path ensures functions always reference the intended schema
*/

ALTER FUNCTION public.sync_chantier_to_planning()
  SET search_path = public;

ALTER FUNCTION public.sync_planning_to_chantier()
  SET search_path = public;

ALTER FUNCTION public.sync_chantier_status_to_technician()
  SET search_path = public;

ALTER FUNCTION public.update_user_status_timestamp()
  SET search_path = public;

ALTER FUNCTION public.initialize_user_status()
  SET search_path = public;

ALTER FUNCTION public.handle_new_app_user()
  SET search_path = public;