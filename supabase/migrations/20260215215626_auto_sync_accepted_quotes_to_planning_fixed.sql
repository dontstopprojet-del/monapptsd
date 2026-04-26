/*
  # Synchronisation automatique des devis acceptés vers le planning

  1. Modifications
    - Ajoute une colonne `quote_request_id` dans `chantiers` pour lier au devis
    - Ajoute une colonne `chantier_id` dans `quote_requests` pour référence inverse
    - Crée un trigger automatique qui génère un chantier quand un devis est accepté
  
  2. Fonctionnement
    - Quand un devis passe en statut "accepted", un chantier est créé automatiquement
    - Les données du client et du devis sont transférées au chantier
    - Le chantier est créé avec le statut "planned" et attend assignation d'un technicien
  
  3. Sécurité
    - Le trigger fonctionne en mode SECURITY DEFINER pour avoir les droits nécessaires
    - Un seul chantier est créé par devis (vérifie que chantier_id est null)
*/

-- Ajouter la colonne quote_request_id dans chantiers si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'quote_request_id'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN quote_request_id uuid REFERENCES quote_requests(id);
    CREATE INDEX IF NOT EXISTS idx_chantiers_quote_request_id ON chantiers(quote_request_id);
  END IF;
END $$;

-- Ajouter la colonne chantier_id dans quote_requests si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quote_requests' AND column_name = 'chantier_id'
  ) THEN
    ALTER TABLE quote_requests ADD COLUMN chantier_id uuid REFERENCES chantiers(id);
    CREATE INDEX IF NOT EXISTS idx_quote_requests_chantier_id ON quote_requests(chantier_id);
  END IF;
END $$;

-- Fonction pour créer automatiquement un chantier quand un devis est accepté
CREATE OR REPLACE FUNCTION auto_create_chantier_from_accepted_quote()
RETURNS TRIGGER AS $$
DECLARE
  v_new_chantier_id uuid;
  v_service_type text;
  v_scheduled_date date;
BEGIN
  -- Vérifier si le devis vient d'être accepté et n'a pas déjà un chantier
  IF NEW.status = 'accepted' 
     AND (OLD.status IS NULL OR OLD.status != 'accepted')
     AND NEW.chantier_id IS NULL THEN
    
    -- Déterminer le titre basé sur le type de service
    v_service_type := COALESCE(NEW.service_type, 'Service');
    
    -- Calculer la date planifiée basée sur la durée estimée
    IF NEW.estimated_duration IS NOT NULL AND NEW.estimated_duration ~ '^\d+' THEN
      v_scheduled_date := CURRENT_DATE + (substring(NEW.estimated_duration from '^\d+')::integer);
    ELSE
      v_scheduled_date := CURRENT_DATE + 7;
    END IF;
    
    -- Créer le chantier (sans client_id pour éviter les contraintes FK)
    INSERT INTO chantiers (
      title,
      client_name,
      location,
      description,
      status,
      progress,
      scheduled_date,
      quote_request_id,
      created_at
    ) VALUES (
      v_service_type || ' - ' || NEW.name,
      NEW.name,
      COALESCE(NEW.address, 'Adresse à définir'),
      COALESCE(NEW.description, '') || 
        CASE 
          WHEN NEW.estimated_price IS NOT NULL THEN 
            E'\n\nPrix convenu: ' || NEW.estimated_price::text || ' GNF'
          ELSE ''
        END ||
        CASE 
          WHEN NEW.estimated_duration IS NOT NULL THEN 
            E'\nDurée estimée: ' || NEW.estimated_duration
          ELSE ''
        END ||
        E'\n\nDevis N°: ' || NEW.tracking_number ||
        E'\nTéléphone: ' || COALESCE(NEW.phone, 'Non renseigné') ||
        E'\nEmail: ' || COALESCE(NEW.email, 'Non renseigné'),
      'planned',
      0,
      v_scheduled_date,
      NEW.id,
      now()
    )
    RETURNING id INTO v_new_chantier_id;
    
    -- Mettre à jour le devis avec l'ID du chantier créé
    UPDATE quote_requests
    SET chantier_id = v_new_chantier_id,
        updated_at = now()
    WHERE id = NEW.id;
    
    -- Créer une notification pour les admins/office
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      created_at
    )
    SELECT 
      au.id,
      'info',
      'Nouveau chantier créé',
      'Le devis ' || NEW.tracking_number || ' a été accepté par ' || NEW.name || '. Un chantier a été automatiquement ajouté au planning et attend assignation.',
      now()
    FROM app_users au
    WHERE au.role IN ('admin', 'office');
    
    RAISE NOTICE 'Chantier % créé automatiquement pour le devis %', v_new_chantier_id, NEW.tracking_number;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_auto_create_chantier ON quote_requests;
CREATE TRIGGER trigger_auto_create_chantier
  AFTER UPDATE ON quote_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR NEW.chantier_id IS NULL)
  EXECUTE FUNCTION auto_create_chantier_from_accepted_quote();

-- Migrer les devis acceptés existants sans chantier
DO $$
DECLARE
  v_accepted_quote RECORD;
  v_new_chantier_id uuid;
  v_scheduled_date date;
  v_count integer := 0;
BEGIN
  FOR v_accepted_quote IN 
    SELECT * FROM quote_requests
    WHERE status = 'accepted' 
      AND chantier_id IS NULL
  LOOP
    -- Calculer la date planifiée
    IF v_accepted_quote.estimated_duration IS NOT NULL 
       AND v_accepted_quote.estimated_duration ~ '^\d+' THEN
      v_scheduled_date := CURRENT_DATE + (substring(v_accepted_quote.estimated_duration from '^\d+')::integer);
    ELSE
      v_scheduled_date := CURRENT_DATE + 7;
    END IF;
    
    -- Créer le chantier
    INSERT INTO chantiers (
      title,
      client_name,
      location,
      description,
      status,
      progress,
      scheduled_date,
      quote_request_id,
      created_at
    ) VALUES (
      COALESCE(v_accepted_quote.service_type, 'Service') || ' - ' || v_accepted_quote.name,
      v_accepted_quote.name,
      COALESCE(v_accepted_quote.address, 'Adresse à définir'),
      COALESCE(v_accepted_quote.description, '') || 
        CASE 
          WHEN v_accepted_quote.estimated_price IS NOT NULL THEN 
            E'\n\nPrix convenu: ' || v_accepted_quote.estimated_price::text || ' GNF'
          ELSE ''
        END ||
        CASE 
          WHEN v_accepted_quote.estimated_duration IS NOT NULL THEN 
            E'\nDurée estimée: ' || v_accepted_quote.estimated_duration
          ELSE ''
        END ||
        E'\n\nDevis N°: ' || v_accepted_quote.tracking_number ||
        E'\nTéléphone: ' || COALESCE(v_accepted_quote.phone, 'Non renseigné') ||
        E'\nEmail: ' || COALESCE(v_accepted_quote.email, 'Non renseigné'),
      'planned',
      0,
      v_scheduled_date,
      v_accepted_quote.id,
      now()
    )
    RETURNING id INTO v_new_chantier_id;
    
    -- Mettre à jour le devis
    UPDATE quote_requests
    SET chantier_id = v_new_chantier_id
    WHERE id = v_accepted_quote.id;
    
    v_count := v_count + 1;
    RAISE NOTICE 'Chantier % créé pour devis %', v_new_chantier_id, v_accepted_quote.tracking_number;
  END LOOP;
  
  RAISE NOTICE 'Migration terminée: % chantier(s) créé(s)', v_count;
END $$;
