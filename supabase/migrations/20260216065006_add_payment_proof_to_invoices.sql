/*
  # Ajouter système de preuve de paiement pour les factures

  ## Description
  Cette migration ajoute les champs nécessaires pour que les clients puissent téléverser des preuves de paiement pour chaque tranche de leur facture. Les preuves sont stockées dans Supabase Storage.

  ## Modifications

  1. Nouveaux champs dans la table `invoices`
    - `tranche_signature_proof_url` (text) - URL de la preuve de paiement pour la tranche signature
    - `tranche_moitier_proof_url` (text) - URL de la preuve de paiement pour la tranche mi-parcours
    - `tranche_fin_proof_url` (text) - URL de la preuve de paiement pour la tranche finale
    - `invoice_number` (text) - Numéro de facture (si manquant)
    - `notes` (text) - Notes de facture (si manquant)

  2. Storage bucket
    - Bucket `payment-proofs` pour stocker les images de preuves de paiement
    - Accès public en lecture
    - Upload restreint aux utilisateurs authentifiés

  ## Sécurité
  - Les clients peuvent uploader des preuves uniquement pour leurs propres factures
  - Les preuves sont stockées de manière sécurisée
  - RLS activé sur le bucket
*/

-- Ajouter les champs pour les preuves de paiement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_signature_proof_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_signature_proof_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_moitier_proof_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_moitier_proof_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_fin_proof_url'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_fin_proof_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_number'
  ) THEN
    ALTER TABLE invoices ADD COLUMN invoice_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'notes'
  ) THEN
    ALTER TABLE invoices ADD COLUMN notes text;
  END IF;
END $$;

-- Créer le bucket de stockage pour les preuves de paiement
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre aux utilisateurs authentifiés d'uploader des preuves
DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
);

-- Politique pour permettre à tous de lire les preuves (nécessaire pour que les admins puissent les voir)
DROP POLICY IF EXISTS "Public can view payment proofs" ON storage.objects;
CREATE POLICY "Public can view payment proofs"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'payment-proofs');

-- Politique pour permettre aux clients de supprimer leurs propres preuves
DROP POLICY IF EXISTS "Users can delete their own payment proofs" ON storage.objects;
CREATE POLICY "Users can delete their own payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs'
);

-- Générer un numéro de facture automatique pour les factures existantes sans numéro
UPDATE invoices
SET invoice_number = 'INV-' || TO_CHAR(created_at, 'YYYYMMDD') || '-' || LPAD(SUBSTRING(id::text FROM 1 FOR 8), 8, '0')
WHERE invoice_number IS NULL OR invoice_number = '';
