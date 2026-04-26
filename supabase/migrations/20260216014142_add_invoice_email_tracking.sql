/*
  # Ajouter système d'envoi de factures par email

  1. Modifications
    - Ajout du champ `sent_to_client` (boolean) pour tracker si la facture a été envoyée
    - Ajout du champ `sent_at` (timestamp) pour enregistrer la date d'envoi
    - Ajout du champ `sent_to_email` (text) pour enregistrer l'email utilisé
    
  2. Notes
    - `sent_to_client` par défaut à false
    - `sent_at` null par défaut, rempli lors de l'envoi
    - `sent_to_email` stocke l'adresse email du destinataire
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_to_client'
  ) THEN
    ALTER TABLE invoices ADD COLUMN sent_to_client boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE invoices ADD COLUMN sent_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'sent_to_email'
  ) THEN
    ALTER TABLE invoices ADD COLUMN sent_to_email text;
  END IF;
END $$;