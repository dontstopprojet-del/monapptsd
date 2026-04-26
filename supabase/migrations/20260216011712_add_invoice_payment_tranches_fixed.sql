/*
  # Ajouter le système de tranches de paiement pour les factures

  ## Modifications
  
  1. Nouveaux champs dans la table `invoices`
    - `tranche_signature_percent` (numeric) - Pourcentage à la signature (défaut 65%)
    - `tranche_signature_amount` (numeric) - Montant à la signature
    - `tranche_signature_paid` (boolean) - Si la tranche signature est payée
    - `tranche_signature_date` (timestamptz) - Date de paiement signature
    
    - `tranche_moitier_percent` (numeric) - Pourcentage à mi-parcours (défaut 20%)
    - `tranche_moitier_amount` (numeric) - Montant à mi-parcours
    - `tranche_moitier_paid` (boolean) - Si la tranche mi-parcours est payée
    - `tranche_moitier_date` (timestamptz) - Date de paiement mi-parcours
    
    - `tranche_fin_percent` (numeric) - Pourcentage à la fin (défaut 15%)
    - `tranche_fin_amount` (numeric) - Montant à la fin
    - `tranche_fin_paid` (boolean) - Si la tranche fin est payée
    - `tranche_fin_date` (timestamptz) - Date de paiement fin
  
  2. Fonctionnalités
    - Calcul automatique des montants basé sur le total
    - Suivi individuel de chaque tranche
    - Système de validation des pourcentages (total = 100%)
*/

-- Ajouter les champs pour les tranches de paiement
DO $$
BEGIN
  -- Tranche Signature (65%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_signature_percent'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_signature_percent numeric DEFAULT 65;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_signature_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_signature_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_signature_paid'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_signature_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_signature_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_signature_date timestamptz;
  END IF;

  -- Tranche Moitier (20%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_moitier_percent'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_moitier_percent numeric DEFAULT 20;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_moitier_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_moitier_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_moitier_paid'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_moitier_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_moitier_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_moitier_date timestamptz;
  END IF;

  -- Tranche Fin (15%)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_fin_percent'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_fin_percent numeric DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_fin_amount'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_fin_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_fin_paid'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_fin_paid boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'tranche_fin_date'
  ) THEN
    ALTER TABLE invoices ADD COLUMN tranche_fin_date timestamptz;
  END IF;
END $$;

-- Fonction pour calculer automatiquement les montants des tranches
CREATE OR REPLACE FUNCTION calculate_invoice_tranches()
RETURNS TRIGGER AS $$
BEGIN
  NEW.tranche_signature_amount := ROUND((NEW.amount * NEW.tranche_signature_percent / 100), 0);
  NEW.tranche_moitier_amount := ROUND((NEW.amount * NEW.tranche_moitier_percent / 100), 0);
  NEW.tranche_fin_amount := ROUND((NEW.amount * NEW.tranche_fin_percent / 100), 0);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour calculer les tranches lors de la création ou modification
DROP TRIGGER IF EXISTS trigger_calculate_invoice_tranches ON invoices;
CREATE TRIGGER trigger_calculate_invoice_tranches
  BEFORE INSERT OR UPDATE OF amount, tranche_signature_percent, tranche_moitier_percent, tranche_fin_percent
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION calculate_invoice_tranches();

-- Fonction pour valider que les pourcentages totalisent 100%
CREATE OR REPLACE FUNCTION validate_invoice_percentages()
RETURNS TRIGGER AS $$
DECLARE
  total_percent numeric;
BEGIN
  total_percent := NEW.tranche_signature_percent + NEW.tranche_moitier_percent + NEW.tranche_fin_percent;
  
  IF total_percent != 100 THEN
    RAISE EXCEPTION 'Le total des pourcentages doit etre egal a 100 (actuel: %)', total_percent;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour valider les pourcentages
DROP TRIGGER IF EXISTS trigger_validate_invoice_percentages ON invoices;
CREATE TRIGGER trigger_validate_invoice_percentages
  BEFORE INSERT OR UPDATE OF tranche_signature_percent, tranche_moitier_percent, tranche_fin_percent
  ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION validate_invoice_percentages();

-- Mettre à jour les factures existantes avec les montants calculés
UPDATE invoices
SET tranche_signature_percent = 65,
    tranche_moitier_percent = 20,
    tranche_fin_percent = 15
WHERE tranche_signature_percent IS NULL;

-- Recalculer les montants pour toutes les factures existantes
UPDATE invoices
SET amount = amount;
