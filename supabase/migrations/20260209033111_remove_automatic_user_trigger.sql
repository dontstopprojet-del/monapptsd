/*
  # Suppression du Trigger Automatique

  1. Problème
    - Le trigger automatique et la fonction RPC créent tous les deux une entrée dans app_users
    - Cela cause une erreur de clé unique (duplicate key) sur l'email
    - Double insertion à chaque inscription

  2. Solution
    - Supprimer le trigger automatique sur auth.users
    - Supprimer la fonction handle_new_user
    - S'appuyer uniquement sur la fonction RPC create_user_profile appelée par le frontend
    - Cela donne un contrôle total et évite les doublons

  3. Avantages
    - Pas de double insertion
    - Contrôle total du processus d'inscription côté frontend
    - Meilleure gestion des erreurs
    - Plus de conflits de clés uniques
*/

-- Supprimer le trigger automatique
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Supprimer la fonction
DROP FUNCTION IF EXISTS public.handle_new_user();
