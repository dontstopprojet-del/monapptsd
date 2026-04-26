/*
  # Simplification: Permettre à tous les utilisateurs authentifiés de voir les techniciens

  1. Problème
    - Les politiques RLS avec get_user_role() peuvent ne pas fonctionner correctement
    - Besoin d'accès simple pour l'assignation
  
  2. Solution
    - Permettre à TOUS les utilisateurs authentifiés de voir les techniciens
    - Maintenir les restrictions sur INSERT/UPDATE/DELETE
  
  3. Sécurité
    - SELECT: Tous les authentifiés peuvent voir (lecture seule)
    - INSERT: Admins uniquement
    - UPDATE: Technicien lui-même ou admins
    - DELETE: Admins uniquement
*/

-- Supprimer l'ancienne politique SELECT
DROP POLICY IF EXISTS "Authenticated users can view technicians for assignment" ON technicians;
DROP POLICY IF EXISTS "Techs and admins can view technicians" ON technicians;

-- Nouvelle politique SELECT simple: tous les authentifiés peuvent voir
CREATE POLICY "All authenticated users can view technicians"
  ON technicians
  FOR SELECT
  TO authenticated
  USING (true);

-- S'assurer que les autres politiques existent
-- INSERT: Admins seulement
DROP POLICY IF EXISTS "Admins can insert technicians" ON technicians;
CREATE POLICY "Admins can insert technicians"
  ON technicians
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- UPDATE: Technicien lui-même ou admins
DROP POLICY IF EXISTS "Techs and admins can update technicians" ON technicians;
CREATE POLICY "Techs and admins can update technicians"
  ON technicians
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    profile_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- DELETE: Admins seulement
DROP POLICY IF EXISTS "Admins can delete technicians" ON technicians;
CREATE POLICY "Admins can delete technicians"
  ON technicians
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Vérification
DO $$
DECLARE
  select_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO select_policies 
  FROM pg_policies 
  WHERE tablename = 'technicians' AND cmd = 'SELECT';
  
  RAISE NOTICE '✓ Politiques RLS simplifiées. % politique(s) SELECT créée(s)', select_policies;
  RAISE NOTICE '✓ Tous les utilisateurs authentifiés peuvent maintenant voir les techniciens';
END $$;
