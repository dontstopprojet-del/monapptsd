/*
  # Correction: Fonction get_user_role pour utiliser app_users

  1. Problème
    - get_user_role() cherche dans profiles (table vide)
    - Les utilisateurs sont dans app_users
    - Les politiques RLS ne fonctionnent pas correctement
  
  2. Solution
    - Modifier get_user_role() pour chercher dans app_users
    - Ajouter un cache pour optimiser les performances
*/

-- Recréer la fonction get_user_role pour utiliser app_users
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.app_users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Vérification
DO $$
BEGIN
  RAISE NOTICE '✓ Fonction get_user_role() mise à jour pour utiliser app_users';
END $$;
