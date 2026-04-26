/*
  # Système complet de suivi des devis

  ## Vue d'ensemble
  Cette migration ajoute tous les champs nécessaires pour un suivi complet des devis avec notifications et gestion d'état avancée.

  ## Modifications sur `quote_requests`

  ### Nouveaux champs ajoutés :
  - `viewed_at` (timestamptz) - Date de première consultation du devis par le client
  - `validity_date` (timestamptz) - Date d'expiration du devis
  - `accepted_at` (timestamptz) - Date d'acceptation du devis
  - `rejected_at` (timestamptz) - Date de rejet du devis
  - `rejected_reason` (text) - Raison du rejet
  - `last_reminded_at` (timestamptz) - Date du dernier rappel envoyé
  - `reminder_count` (integer) - Nombre de rappels envoyés
  - `archived_at` (timestamptz) - Date d'archivage du devis

  ## Statuts disponibles :
  - `pending` - En attente (nouveau devis soumis)
  - `reviewing` - En cours d'examen
  - `quoted` - Devis envoyé (avec montant)
  - `accepted` - Accepté par le client
  - `rejected` - Refusé par le client
  - `expired` - Expiré (dépassé la date de validité)
  - `completed` - Terminé (travaux effectués)
  - `archived` - Archivé

  ## Fonctionnalités :
  - Suivi de consultation (quand le client voit le devis)
  - Gestion de la validité avec expiration automatique
  - Historique des acceptations/rejets
  - Système de rappels automatiques
  - Archivage des devis clôturés
*/

-- Ajouter les champs de suivi
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'viewed_at'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN viewed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'validity_date'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN validity_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'accepted_at'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN accepted_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN rejected_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'rejected_reason'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN rejected_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'last_reminded_at'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN last_reminded_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'reminder_count'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN reminder_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'archived_at'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN archived_at timestamptz;
  END IF;
END $$;

-- Créer des index pour les recherches
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_viewed_at ON quote_requests(viewed_at);
CREATE INDEX IF NOT EXISTS idx_quote_requests_validity_date ON quote_requests(validity_date);
CREATE INDEX IF NOT EXISTS idx_quote_requests_archived_at ON quote_requests(archived_at);

-- Fonction pour marquer automatiquement les devis expirés
CREATE OR REPLACE FUNCTION mark_expired_quotes()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE quote_requests
  SET status = 'expired'
  WHERE status IN ('quoted', 'reviewing')
    AND validity_date < now()
    AND validity_date IS NOT NULL;
END;
$$;

-- Fonction pour enregistrer la consultation d'un devis
CREATE OR REPLACE FUNCTION record_quote_view(quote_tracking_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE quote_requests
  SET viewed_at = COALESCE(viewed_at, now()),
      updated_at = now()
  WHERE tracking_number = quote_tracking_number
    AND viewed_at IS NULL;
END;
$$;

-- Fonction pour accepter un devis
CREATE OR REPLACE FUNCTION accept_quote(quote_tracking_number text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE quote_requests
  SET status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  WHERE tracking_number = quote_tracking_number
    AND status IN ('quoted', 'reviewing');
END;
$$;

-- Fonction pour rejeter un devis
CREATE OR REPLACE FUNCTION reject_quote(quote_tracking_number text, reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE quote_requests
  SET status = 'rejected',
      rejected_at = now(),
      rejected_reason = reason,
      updated_at = now()
  WHERE tracking_number = quote_tracking_number
    AND status IN ('quoted', 'reviewing');
END;
$$;

-- Définir les dates de validité par défaut pour les devis existants sans date
UPDATE quote_requests
SET validity_date = created_at + interval '30 days'
WHERE validity_date IS NULL 
  AND status IN ('quoted', 'reviewing')
  AND created_at IS NOT NULL;