/*
  # Correction politique RLS pour insertion de factures

  1. Modifications
    - Suppression de l'ancienne politique d'insertion qui utilise la correspondance email
    - Création d'une nouvelle politique simplifiée qui utilise directement auth.uid()
  
  2. Sécurité
    - La politique permet aux admins et office de créer des factures
    - Utilise directement l'ID de l'utilisateur authentifié pour vérifier le rôle
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Admins can insert invoices" ON invoices;

-- Créer la nouvelle politique simplifiée
CREATE POLICY "Admins can insert invoices"
  ON invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );
