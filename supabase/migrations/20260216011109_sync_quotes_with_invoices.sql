/*
  # Synchroniser les devis avec les factures

  1. Modifications de la table invoices
    - Ajout de `quote_request_id` (uuid, foreign key vers quote_requests)
    - Index pour les recherches rapides
    
  2. Fonctionnalités automatiques
    - Fonction pour générer une facture à partir d'un devis accepté
    - Trigger optionnel pour automatiser la création de facture
    
  3. Workflow
    - Quand un devis est accepté, une facture peut être générée automatiquement
    - Facture hérite des informations du devis: client, montant, projet
    - Date d'échéance calculée automatiquement (30 jours après acceptation)
*/

-- Ajouter le lien entre facture et devis
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'quote_request_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN quote_request_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_invoices_quote_request_id ON invoices(quote_request_id);

-- Fonction pour générer une facture à partir d'un devis accepté
CREATE OR REPLACE FUNCTION generate_invoice_from_quote(p_quote_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quote_record RECORD;
  v_invoice_id uuid;
  v_invoice_number text;
  v_due_date date;
BEGIN
  SELECT 
    qr.id,
    qr.email,
    qr.name,
    qr.phone,
    qr.estimated_price,
    qr.chantier_id,
    qr.user_id,
    qr.description
  INTO v_quote_record
  FROM quote_requests qr
  WHERE qr.id = p_quote_id
    AND qr.status = 'accepted'
    AND qr.estimated_price IS NOT NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Devis non trouvé ou non accepté';
  END IF;

  IF EXISTS (SELECT 1 FROM invoices WHERE quote_request_id = p_quote_id) THEN
    RAISE EXCEPTION 'Une facture existe déjà pour ce devis';
  END IF;

  v_invoice_number := 'INV-' || to_char(now(), 'YYYYMM') || '-' || LPAD(floor(random() * 10000)::text, 4, '0');
  v_due_date := CURRENT_DATE + interval '30 days';

  INSERT INTO invoices (
    invoice_number,
    client_id,
    client_name,
    amount,
    due_date,
    project_id,
    quote_request_id,
    notes,
    status
  ) VALUES (
    v_invoice_number,
    v_quote_record.user_id,
    v_quote_record.name,
    v_quote_record.estimated_price,
    v_due_date,
    v_quote_record.chantier_id,
    p_quote_id,
    'Facture générée automatiquement depuis le devis',
    'En attente'
  )
  RETURNING id INTO v_invoice_id;

  RETURN v_invoice_id;
END;
$$;

-- Fonction pour vérifier si un devis a déjà une facture
CREATE OR REPLACE FUNCTION quote_has_invoice(p_quote_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM invoices WHERE quote_request_id = p_quote_id
  );
END;
$$;

-- Ajouter un commentaire sur la colonne pour documentation
COMMENT ON COLUMN invoices.quote_request_id IS 'Lien vers le devis source qui a généré cette facture';
