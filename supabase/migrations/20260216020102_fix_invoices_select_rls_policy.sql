/*
  # Correction politique RLS pour lecture des factures

  1. Modifications
    - Suppression de l'ancienne politique SELECT qui utilise la correspondance email
    - Création d'une nouvelle politique simplifiée qui utilise directement auth.uid()
  
  2. Sécurité
    - Les clients peuvent voir leurs propres factures (client_id = auth.uid())
    - Les admins et employés bureau peuvent voir toutes les factures
    - Utilise directement l'ID de l'utilisateur authentifié pour vérifier le rôle
*/

-- Supprimer l'ancienne politique
DROP POLICY IF EXISTS "Users can view invoices" ON invoices;

-- Créer la nouvelle politique simplifiée pour SELECT
CREATE POLICY "Users can view invoices"
  ON invoices
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );
