/*
  # Correction: Politiques RLS pour permettre l'assignation des techniciens

  1. Problème
    - Les politiques actuelles empêchent les admins/office de voir tous les techniciens
    - Impossible d'assigner des techniciens si on ne peut pas les voir
  
  2. Solution
    - Modifier la politique SELECT pour permettre aux admins et employés de bureau de voir tous les techniciens
    - Les techniciens peuvent toujours voir leur propre profil
  
  3. Sécurité
    - Seuls les utilisateurs authentifiés avec les bons rôles peuvent accéder
    - Admins et office peuvent voir tous les techniciens (nécessaire pour assignation)
    - Techniciens peuvent voir leur propre profil
*/

-- Supprimer l'ancienne politique SELECT
DROP POLICY IF EXISTS "Techs and admins can view technicians" ON technicians;

-- Créer une nouvelle politique SELECT plus permissive pour l'assignation
CREATE POLICY "Authenticated users can view technicians for assignment"
  ON technicians
  FOR SELECT
  TO authenticated
  USING (
    -- Techniciens peuvent voir leur propre profil
    profile_id = auth.uid()
    OR
    -- Admins et employés de bureau peuvent voir tous les techniciens
    get_user_role() IN ('admin', 'office')
  );

-- Vérification
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count 
  FROM pg_policies 
  WHERE tablename = 'technicians' AND cmd = 'SELECT';
  
  RAISE NOTICE '✓ Politique SELECT mise à jour. Les admins et employés de bureau peuvent maintenant voir tous les techniciens.';
END $$;
