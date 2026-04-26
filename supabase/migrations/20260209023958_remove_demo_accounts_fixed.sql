/*
  # Suppression des Comptes Démo pour Production

  1. Description
    - Supprime tous les comptes de démonstration avant le lancement en production
    - Nettoie la base de données de toutes les données de test

  2. Comptes supprimés
    - tidiane@tsdetfils.com (Admin démo)
    - contact@tsdetfils.com (Admin démo)
    - admin@tsdetfils.com (Admin démo)
    - client@tsdetfils.com (Client démo)
    - tech@tsdetfils.com (Technicien démo)
    - office@tsdetfils.com (Employé bureau démo)

  3. Tables affectées
    - admin_settings (mise à NULL des références)
    - app_users (suppression via CASCADE)
    - auth.users (suppression des comptes d'authentification)

  4. Sécurité
    - Cette migration est réversible manuellement si nécessaire
    - Les données réelles des utilisateurs ne sont pas affectées
*/

DO $$
DECLARE
  demo_user_id uuid;
  demo_emails text[] := ARRAY[
    'tidiane@tsdetfils.com',
    'contact@tsdetfils.com',
    'admin@tsdetfils.com',
    'client@tsdetfils.com',
    'tech@tsdetfils.com',
    'office@tsdetfils.com'
  ];
BEGIN
  -- Étape 1: Mettre à NULL les références dans admin_settings
  UPDATE admin_settings 
  SET updated_by = NULL 
  WHERE updated_by IN (
    SELECT id FROM auth.users WHERE email = ANY(demo_emails)
  );
  
  RAISE NOTICE 'Références dans admin_settings mises à NULL';
  
  -- Étape 2: Supprimer les comptes démo de auth.users
  -- La suppression CASCADE va automatiquement supprimer les entrées dans app_users
  FOR demo_user_id IN 
    SELECT id FROM auth.users 
    WHERE email = ANY(demo_emails)
  LOOP
    -- Supprimer l'utilisateur de auth.users
    DELETE FROM auth.users WHERE id = demo_user_id;
    
    RAISE NOTICE 'Compte démo supprimé: %', demo_user_id;
  END LOOP;
  
  RAISE NOTICE 'Tous les comptes démo ont été supprimés avec succès';
END $$;
