/*
  # Corriger les RLS policies pour la table invoices

  1. Problème
    - Les policies utilisent `app_users.id = auth.uid()` mais `app_users.id` est un UUID généré indépendamment
    - Les admins ne peuvent pas créer de factures car la vérification échoue
    
  2. Solution
    - Remplacer les policies pour utiliser la comparaison par email
    - L'email de auth.users doit correspondre à l'email dans app_users
    
  3. Modifications
    - Supprimer les anciennes policies
    - Créer de nouvelles policies correctes pour INSERT, UPDATE, DELETE, SELECT
*/

DROP POLICY IF EXISTS "Admins can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Clients can view their invoices" ON invoices;

CREATE POLICY "Admins can insert invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins can update invoices"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins can delete invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Users can view invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND app_users.role IN ('admin', 'office')
    )
  );