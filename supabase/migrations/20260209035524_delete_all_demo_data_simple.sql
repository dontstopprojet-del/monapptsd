/*
  # Suppression de toutes les données de démonstration

  1. Objectif
    - Supprimer toutes les données de test/démonstration
    - Remettre l'application à zéro
    - Conserver uniquement la structure de la base de données

  2. Tables affectées
    - Tous les utilisateurs (auth.users et app_users)
    - Toutes les données métier (chantiers, incidents, notes, etc.)
    - Toutes les données de configuration (stocks, services, etc.)

  3. Note importante
    - Cette migration supprime TOUTES les données
    - La structure de la base de données reste intacte
    - Les migrations précédentes ne sont pas affectées
*/

-- Supprimer tous les utilisateurs auth d'abord
DO $$
DECLARE
  user_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    BEGIN
      DELETE FROM auth.users WHERE id = user_record.id;
      deleted_count := deleted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Erreur lors de la suppression de l''utilisateur %: %', user_record.id, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '% utilisateur(s) auth supprimé(s)', deleted_count;
END $$;

-- Vider toutes les tables publiques (CASCADE supprime les données dépendantes)
TRUNCATE TABLE public.admin_alerts CASCADE;
TRUNCATE TABLE public.birthdays CASCADE;
TRUNCATE TABLE public.daily_notes CASCADE;
TRUNCATE TABLE public.incidents CASCADE;
TRUNCATE TABLE public.legal_signatures CASCADE;
TRUNCATE TABLE public.legal_terms_acceptance CASCADE;
TRUNCATE TABLE public.non_compete_signatures CASCADE;
TRUNCATE TABLE public.notification_settings CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.payment_records CASCADE;
TRUNCATE TABLE public.project_photos CASCADE;
TRUNCATE TABLE public.projects CASCADE;
TRUNCATE TABLE public.site_images CASCADE;
TRUNCATE TABLE public.site_notes CASCADE;
TRUNCATE TABLE public.shared_locations CASCADE;
TRUNCATE TABLE public.technician_gps_tracking CASCADE;
TRUNCATE TABLE public.work_shifts CASCADE;
TRUNCATE TABLE public.worksite_completions CASCADE;
TRUNCATE TABLE public.trigger_error_log CASCADE;
TRUNCATE TABLE public.mission_trips CASCADE;
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.reviews CASCADE;
TRUNCATE TABLE public.planning CASCADE;
TRUNCATE TABLE public.chantiers CASCADE;
TRUNCATE TABLE public.quotes CASCADE;
TRUNCATE TABLE public.service_items CASCADE;
TRUNCATE TABLE public.technicians CASCADE;
TRUNCATE TABLE public.clients CASCADE;
TRUNCATE TABLE public.profiles CASCADE;
TRUNCATE TABLE public.services CASCADE;
TRUNCATE TABLE public.stocks CASCADE;
TRUNCATE TABLE public.reports CASCADE;
TRUNCATE TABLE public.admin_settings CASCADE;
TRUNCATE TABLE public.app_users CASCADE;
