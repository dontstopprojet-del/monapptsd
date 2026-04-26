/*
  # Synchronisation automatique des techniciens pour le planning

  1. Fonctionnalités
    - Crée automatiquement une entrée dans `technicians` quand un user devient technicien
    - Supprime l'entrée si le role change
    - Synchronise les techniciens existants
  
  2. Tables modifiées
    - `technicians`: table liée à app_users via profile_id
  
  3. Triggers
    - Trigger automatique pour créer/supprimer les entrées technicians
*/

-- Fonction pour synchroniser automatiquement les techniciens
CREATE OR REPLACE FUNCTION sync_technician_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'utilisateur devient technicien
  IF NEW.role = 'technician' AND (OLD.role IS NULL OR OLD.role != 'technician') THEN
    -- Vérifier si une entrée existe déjà
    IF NOT EXISTS (SELECT 1 FROM technicians WHERE profile_id = NEW.id) THEN
      INSERT INTO technicians (
        profile_id,
        role_level,
        status,
        satisfaction_rate,
        total_revenue,
        color,
        completed_jobs,
        battery_level,
        created_at
      ) VALUES (
        NEW.id,
        'junior',
        'disponible',
        100,
        0,
        '#' || lpad(to_hex((random() * 16777215)::int), 6, '0'),
        0,
        100,
        now()
      );
      
      RAISE NOTICE 'Technicien créé pour user %', NEW.email;
    END IF;
  END IF;
  
  -- Si l'utilisateur n'est plus technicien, supprimer l'entrée
  IF OLD.role = 'technician' AND NEW.role != 'technician' THEN
    DELETE FROM technicians WHERE profile_id = NEW.id;
    RAISE NOTICE 'Entrée technicien supprimée pour user %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_technician ON app_users;
CREATE TRIGGER trigger_sync_technician
  AFTER INSERT OR UPDATE OF role ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_technician_profile();

-- Synchroniser les techniciens existants
DO $$
DECLARE
  v_user RECORD;
  v_count integer := 0;
BEGIN
  FOR v_user IN 
    SELECT id, email, role
    FROM app_users
    WHERE role = 'technician'
  LOOP
    -- Vérifier si le technicien n'existe pas déjà
    IF NOT EXISTS (SELECT 1 FROM technicians WHERE profile_id = v_user.id) THEN
      INSERT INTO technicians (
        profile_id,
        role_level,
        status,
        satisfaction_rate,
        total_revenue,
        color,
        completed_jobs,
        battery_level,
        created_at
      ) VALUES (
        v_user.id,
        'junior',
        'disponible',
        100,
        0,
        '#' || lpad(to_hex((random() * 16777215)::int), 6, '0'),
        0,
        100,
        now()
      );
      
      v_count := v_count + 1;
      RAISE NOTICE 'Technicien synchronisé: %', v_user.email;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Synchronisation terminée: % technicien(s) ajouté(s)', v_count;
END $$;

-- Fonction pour auto-assigner des techniciens aux chantiers selon disponibilité
CREATE OR REPLACE FUNCTION auto_assign_technician_to_chantier()
RETURNS TRIGGER AS $$
DECLARE
  v_available_tech_id uuid;
BEGIN
  -- Si un chantier est créé sans technicien assigné
  IF NEW.technician_id IS NULL AND NEW.status = 'planned' THEN
    -- Trouver un technicien disponible
    SELECT t.id INTO v_available_tech_id
    FROM technicians t
    WHERE t.status = 'disponible'
    ORDER BY t.completed_jobs ASC, random()
    LIMIT 1;
    
    -- Si un technicien disponible existe, suggérer l'assignation
    IF v_available_tech_id IS NOT NULL THEN
      -- Créer une notification pour les admins
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
        'Nouveau chantier à assigner',
        'Le chantier "' || NEW.title || '" est prêt à être assigné à un technicien.',
        now()
      FROM app_users au
      WHERE au.role IN ('admin', 'office');
      
      RAISE NOTICE 'Suggestion d''assignation pour chantier %', NEW.title;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger pour suggestion d'assignation
DROP TRIGGER IF EXISTS trigger_auto_assign_tech ON chantiers;
CREATE TRIGGER trigger_auto_assign_tech
  AFTER INSERT ON chantiers
  FOR EACH ROW
  WHEN (NEW.technician_id IS NULL AND NEW.status = 'planned')
  EXECUTE FUNCTION auto_assign_technician_to_chantier();
