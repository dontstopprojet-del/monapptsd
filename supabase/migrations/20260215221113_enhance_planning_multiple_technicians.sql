/*
  # Amélioration du système de planning avec techniciens multiples

  1. Nouvelles fonctionnalités
    - Support de plusieurs techniciens par chantier via table de liaison
    - Synchronisation automatique chantiers → planning
    - Gestion des plages de dates personnalisées
    - Vues multiples: jour, semaine, mois
  
  2. Tables créées
    - `planning_technicians`: table de liaison many-to-many
  
  3. Modifications
    - Ajout de champs `end_date` au planning pour les chantiers multi-jours
    - Triggers de synchronisation automatique
  
  4. Sécurité
    - RLS sur toutes les nouvelles tables
*/

-- Ajouter support de date de fin pour les chantiers multi-jours
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'planning' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE planning ADD COLUMN end_date date;
  END IF;
END $$;

-- Table de liaison pour plusieurs techniciens par planning
CREATE TABLE IF NOT EXISTS planning_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id uuid REFERENCES planning(id) ON DELETE CASCADE NOT NULL,
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(planning_id, technician_id)
);

ALTER TABLE planning_technicians ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins et techniciens peuvent voir les assignations"
  ON planning_technicians FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office', 'technician')
    )
  );

CREATE POLICY "Admins et office peuvent créer les assignations"
  ON planning_technicians FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins et office peuvent modifier les assignations"
  ON planning_technicians FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins et office peuvent supprimer les assignations"
  ON planning_technicians FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Fonction pour synchroniser automatiquement chantier → planning
CREATE OR REPLACE FUNCTION sync_chantier_to_planning()
RETURNS TRIGGER AS $$
DECLARE
  v_planning_id uuid;
  v_end_date date;
BEGIN
  -- Si le chantier a une date et un technicien assigné
  IF NEW.scheduled_date IS NOT NULL AND NEW.technician_id IS NOT NULL THEN
    
    -- Calculer la date de fin (3 jours après par défaut)
    v_end_date := NEW.scheduled_date + INTERVAL '3 days';
    
    -- Vérifier si une entrée planning existe déjà pour ce chantier
    SELECT id INTO v_planning_id
    FROM planning
    WHERE chantier_id = NEW.id
    LIMIT 1;
    
    IF v_planning_id IS NULL THEN
      -- Créer une nouvelle entrée dans planning
      INSERT INTO planning (
        chantier_id,
        technician_id,
        scheduled_date,
        end_date,
        start_time,
        end_time
      ) VALUES (
        NEW.id,
        NEW.technician_id,
        NEW.scheduled_date,
        v_end_date,
        COALESCE(NEW.scheduled_time, '08:00'),
        '17:00'
      )
      RETURNING id INTO v_planning_id;
      
      -- Ajouter le technicien à la table de liaison
      INSERT INTO planning_technicians (planning_id, technician_id)
      VALUES (v_planning_id, NEW.technician_id)
      ON CONFLICT (planning_id, technician_id) DO NOTHING;
      
      RAISE NOTICE 'Chantier % synchronisé au planning', NEW.title;
    ELSE
      -- Mettre à jour l'entrée existante
      UPDATE planning
      SET 
        technician_id = NEW.technician_id,
        scheduled_date = NEW.scheduled_date,
        end_date = v_end_date,
        start_time = COALESCE(NEW.scheduled_time, start_time)
      WHERE id = v_planning_id;
      
      -- S'assurer que le technicien est dans la table de liaison
      INSERT INTO planning_technicians (planning_id, technician_id)
      VALUES (v_planning_id, NEW.technician_id)
      ON CONFLICT (planning_id, technician_id) DO NOTHING;
      
      RAISE NOTICE 'Planning % mis à jour', v_planning_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_chantier_to_planning ON chantiers;
CREATE TRIGGER trigger_sync_chantier_to_planning
  AFTER INSERT OR UPDATE OF technician_id, scheduled_date, scheduled_time ON chantiers
  FOR EACH ROW
  EXECUTE FUNCTION sync_chantier_to_planning();

-- Synchroniser les chantiers existants avec techniciens assignés
DO $$
DECLARE
  v_chantier RECORD;
  v_planning_id uuid;
  v_end_date date;
  v_count integer := 0;
BEGIN
  FOR v_chantier IN 
    SELECT id, title, technician_id, scheduled_date, scheduled_time
    FROM chantiers
    WHERE technician_id IS NOT NULL AND scheduled_date IS NOT NULL
  LOOP
    v_end_date := v_chantier.scheduled_date + INTERVAL '3 days';
    
    -- Vérifier si déjà dans planning
    SELECT id INTO v_planning_id
    FROM planning
    WHERE chantier_id = v_chantier.id
    LIMIT 1;
    
    IF v_planning_id IS NULL THEN
      -- Créer dans planning
      INSERT INTO planning (
        chantier_id,
        technician_id,
        scheduled_date,
        end_date,
        start_time,
        end_time
      ) VALUES (
        v_chantier.id,
        v_chantier.technician_id,
        v_chantier.scheduled_date,
        v_end_date,
        COALESCE(v_chantier.scheduled_time, '08:00'),
        '17:00'
      )
      RETURNING id INTO v_planning_id;
      
      -- Ajouter à la table de liaison
      INSERT INTO planning_technicians (planning_id, technician_id)
      VALUES (v_planning_id, v_chantier.technician_id)
      ON CONFLICT DO NOTHING;
      
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Synchronisation terminée: % chantier(s) ajouté(s) au planning', v_count;
END $$;

-- Activer realtime sur planning_technicians
ALTER PUBLICATION supabase_realtime ADD TABLE planning_technicians;

-- Fonction helper pour obtenir tous les techniciens d'un planning
CREATE OR REPLACE FUNCTION get_planning_technicians(p_planning_id uuid)
RETURNS TABLE (
  technician_id uuid,
  technician_name text,
  technician_status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    au.name,
    t.status
  FROM planning_technicians pt
  JOIN technicians t ON t.id = pt.technician_id
  LEFT JOIN app_users au ON au.id = t.profile_id
  WHERE pt.planning_id = p_planning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
