/*
  # Correction politiques RLS pour UPDATE et DELETE des factures

  1. Modifications
    - Suppression des anciennes politiques UPDATE et DELETE qui utilisent la correspondance email
    - Création de nouvelles politiques simplifiées qui utilisent directement auth.uid()
  
  2. Sécurité
    - Seuls les admins et employés bureau peuvent modifier/supprimer des factures
    - Utilise directement l'ID de l'utilisateur authentifié pour vérifier le rôle
*/

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Admins can update invoices" ON invoices;
DROP POLICY IF EXISTS "Admins can delete invoices" ON invoices;

-- Créer la nouvelle politique pour UPDATE
CREATE POLICY "Admins can update invoices"
  ON invoices
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Créer la nouvelle politique pour DELETE
CREATE POLICY "Admins can delete invoices"
  ON invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );
