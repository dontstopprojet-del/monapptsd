/*
  # Système de Suivi des Devis

  ## Vue d'ensemble
  Ajoute un système de suivi pour que les clients puissent consulter l'état de leurs demandes de devis.
  
  ## Modifications

  ### 1. Ajout de colonnes à `quote_requests`
  - `tracking_number` (text, unique) - Numéro de suivi généré automatiquement (ex: DEV-20260214-XXXX)
  - `client_email_for_tracking` (text) - Email du client pour recherche
  - `response_notes` (text) - Notes de réponse de l'équipe
  - `estimated_price` (decimal) - Prix estimé du devis
  - `estimated_duration` (text) - Durée estimée des travaux
  - `assigned_to` (uuid) - Technicien assigné (référence app_users)
  - `updated_at` (timestamptz) - Date de dernière mise à jour

  ### 2. Fonction de génération de numéro de tracking
  Génère automatiquement un numéro unique au format DEV-YYYYMMDD-XXXX

  ### 3. Trigger
  Déclenche la génération du numéro de tracking lors de l'insertion

  ## Sécurité
  - Les clients peuvent rechercher leurs devis via email + tracking number
  - Accès en lecture pour les utilisateurs authentifiés
*/

-- Ajouter les colonnes manquantes à quote_requests si elles n'existent pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'tracking_number'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN tracking_number text UNIQUE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'client_email_for_tracking'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN client_email_for_tracking text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'response_notes'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN response_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'estimated_price'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN estimated_price decimal(10, 2);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'estimated_duration'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN estimated_duration text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN assigned_to uuid REFERENCES app_users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Créer un index sur tracking_number pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_quote_requests_tracking_number ON quote_requests(tracking_number);

-- Créer un index sur email pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_quote_requests_email_tracking ON quote_requests(client_email_for_tracking);

-- Fonction pour générer un numéro de tracking unique
CREATE OR REPLACE FUNCTION generate_tracking_number()
RETURNS text AS $$
DECLARE
  new_tracking_number text;
  random_suffix text;
  is_unique boolean;
BEGIN
  is_unique := false;
  
  WHILE NOT is_unique LOOP
    random_suffix := LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    new_tracking_number := 'DEV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || random_suffix;
    
    SELECT NOT EXISTS (
      SELECT 1 FROM quote_requests WHERE tracking_number = new_tracking_number
    ) INTO is_unique;
  END LOOP;
  
  RETURN new_tracking_number;
END;
$$ LANGUAGE plpgsql;

-- Fonction trigger pour générer automatiquement le tracking number
CREATE OR REPLACE FUNCTION set_tracking_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tracking_number IS NULL THEN
    NEW.tracking_number := generate_tracking_number();
  END IF;
  
  IF NEW.client_email_for_tracking IS NULL AND NEW.email IS NOT NULL THEN
    NEW.client_email_for_tracking := NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger si il n'existe pas
DROP TRIGGER IF EXISTS trigger_set_tracking_number ON quote_requests;
CREATE TRIGGER trigger_set_tracking_number
  BEFORE INSERT ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_tracking_number();

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_quote_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
DROP TRIGGER IF EXISTS trigger_update_quote_request_timestamp ON quote_requests;
CREATE TRIGGER trigger_update_quote_request_timestamp
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_request_timestamp();

-- Mettre à jour les devis existants sans tracking number
UPDATE quote_requests
SET tracking_number = generate_tracking_number(),
    client_email_for_tracking = email
WHERE tracking_number IS NULL;

-- Politique RLS pour permettre aux clients de voir leurs devis via tracking number
DROP POLICY IF EXISTS "Clients can view their own quotes by tracking" ON quote_requests;
CREATE POLICY "Clients can view their own quotes by tracking"
  ON quote_requests FOR SELECT
  TO anon, authenticated
  USING (true);
