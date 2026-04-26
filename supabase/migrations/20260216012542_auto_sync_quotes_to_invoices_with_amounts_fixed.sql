/*
  # Synchronisation automatique des devis vers les factures avec montants

  ## Modifications
  
  1. Fonctionnalités
    - Synchronisation automatique du montant du devis vers la facture
    - Création automatique de facture lors de l'acceptation d'un devis
    - Mise à jour automatique de la facture si le montant du devis change
  
  2. Trigger
    - Créer/mettre à jour la facture quand un devis est accepté
    - Synchroniser les montants automatiquement
*/

-- Fonction pour synchroniser les devis acceptés avec les factures
CREATE OR REPLACE FUNCTION sync_accepted_quote_to_invoice()
RETURNS TRIGGER AS $$
DECLARE
  existing_invoice_id uuid;
  invoice_data record;
BEGIN
  -- Ne traiter que les devis acceptés
  IF NEW.status = 'accepted' THEN
    -- Vérifier si une facture existe déjà pour ce devis
    SELECT id INTO existing_invoice_id
    FROM invoices
    WHERE quote_request_id = NEW.id;

    IF existing_invoice_id IS NOT NULL THEN
      -- Mettre à jour la facture existante avec le nouveau montant
      UPDATE invoices
      SET 
        amount = COALESCE(NEW.estimated_price, 0),
        client_name = COALESCE(NEW.name, client_name),
        notes = COALESCE('Devis accepté: ' || NEW.service_type, notes)
      WHERE id = existing_invoice_id;
    ELSE
      -- Créer une nouvelle facture
      INSERT INTO invoices (
        invoice_number,
        client_name,
        client_id,
        amount,
        due_date,
        status,
        quote_request_id,
        notes,
        tranche_signature_percent,
        tranche_moitier_percent,
        tranche_fin_percent
      )
      VALUES (
        'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
        NEW.name,
        NEW.user_id,
        COALESCE(NEW.estimated_price, 0),
        CURRENT_DATE + INTERVAL '30 days',
        'En attente',
        NEW.id,
        'Facture générée automatiquement depuis le devis: ' || NEW.service_type,
        65,
        20,
        15
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS trigger_sync_accepted_quote_to_invoice ON quote_requests;

-- Créer le trigger pour synchroniser les devis acceptés
CREATE TRIGGER trigger_sync_accepted_quote_to_invoice
  AFTER INSERT OR UPDATE OF status, estimated_price
  ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION sync_accepted_quote_to_invoice();

-- Fonction pour mettre à jour les factures existantes avec les montants des devis
CREATE OR REPLACE FUNCTION update_existing_invoices_from_quotes()
RETURNS void AS $$
BEGIN
  UPDATE invoices i
  SET 
    amount = COALESCE(qr.estimated_price, i.amount),
    client_name = COALESCE(qr.name, i.client_name)
  FROM quote_requests qr
  WHERE i.quote_request_id = qr.id
    AND qr.status = 'accepted'
    AND qr.estimated_price IS NOT NULL
    AND qr.estimated_price > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Exécuter la mise à jour pour les factures existantes
SELECT update_existing_invoices_from_quotes();

-- Fonction pour créer des factures pour les devis acceptés qui n'en ont pas
CREATE OR REPLACE FUNCTION create_missing_invoices_for_accepted_quotes()
RETURNS void AS $$
DECLARE
  quote_record record;
BEGIN
  FOR quote_record IN 
    SELECT qr.*
    FROM quote_requests qr
    LEFT JOIN invoices i ON i.quote_request_id = qr.id
    WHERE qr.status = 'accepted'
      AND qr.estimated_price IS NOT NULL
      AND qr.estimated_price > 0
      AND i.id IS NULL
  LOOP
    INSERT INTO invoices (
      invoice_number,
      client_name,
      client_id,
      amount,
      due_date,
      status,
      quote_request_id,
      notes,
      tranche_signature_percent,
      tranche_moitier_percent,
      tranche_fin_percent
    )
    VALUES (
      'INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0'),
      quote_record.name,
      quote_record.user_id,
      quote_record.estimated_price,
      CURRENT_DATE + INTERVAL '30 days',
      'En attente',
      quote_record.id,
      'Facture générée automatiquement depuis le devis: ' || quote_record.service_type,
      65,
      20,
      15
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer les factures manquantes pour les devis acceptés
SELECT create_missing_invoices_for_accepted_quotes();
