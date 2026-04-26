/*
  # Correction: Rediriger la clé étrangère de technicians vers app_users

  1. Problème
    - technicians.profile_id référence profiles.id (table vide)
    - Les utilisateurs sont dans app_users
    - Impossible de créer des techniciens
  
  2. Solution
    - Supprimer l'ancienne contrainte foreign key
    - Créer une nouvelle contrainte vers app_users.id
    - Synchroniser les techniciens existants
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE technicians 
DROP CONSTRAINT IF EXISTS technicians_profile_id_fkey;

-- Ajouter la nouvelle contrainte vers app_users
ALTER TABLE technicians
ADD CONSTRAINT technicians_profile_id_fkey
FOREIGN KEY (profile_id) REFERENCES app_users(id) ON DELETE CASCADE;

-- Ajouter une contrainte unique sur profile_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'technicians_profile_id_key'
  ) THEN
    ALTER TABLE technicians ADD CONSTRAINT technicians_profile_id_key UNIQUE (profile_id);
  END IF;
END $$;

-- Supprimer les doublons potentiels
DELETE FROM technicians t1
WHERE EXISTS (
  SELECT 1 FROM technicians t2
  WHERE t2.profile_id = t1.profile_id
  AND t2.created_at > t1.created_at
);

-- Créer les entrées technicians pour tous les utilisateurs avec role 'tech'
INSERT INTO technicians (profile_id, status, role_level, completed_jobs, satisfaction_rate)
SELECT 
  au.id,
  'Dispo',
  'Tech',
  0,
  100.0
FROM app_users au
WHERE (au.role = 'tech' OR au.role = 'technician')
  AND NOT EXISTS (
    SELECT 1 FROM technicians t WHERE t.profile_id = au.id
  )
ON CONFLICT (profile_id) DO NOTHING;

-- Fonction pour synchroniser automatiquement
CREATE OR REPLACE FUNCTION sync_technician_on_user_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.role = 'tech' OR NEW.role = 'technician') THEN
    INSERT INTO technicians (profile_id, status, role_level, completed_jobs, satisfaction_rate)
    VALUES (NEW.id, 'Dispo', 'Tech', 0, 100.0)
    ON CONFLICT (profile_id) DO NOTHING;
    
    RAISE NOTICE 'Technicien créé: %', NEW.name;
  END IF;
  
  IF (TG_OP = 'UPDATE' AND OLD.role IN ('tech', 'technician') AND NEW.role NOT IN ('tech', 'technician')) THEN
    DELETE FROM technicians WHERE profile_id = NEW.id;
    RAISE NOTICE 'Technicien supprimé: %', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_sync_technician_role ON app_users;
CREATE TRIGGER trigger_sync_technician_role
  AFTER INSERT OR UPDATE OF role ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION sync_technician_on_user_role_change();

-- Vérification finale
DO $$
DECLARE
  tech_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tech_count FROM technicians;
  SELECT COUNT(*) INTO user_count FROM app_users WHERE role IN ('tech', 'technician');
  
  RAISE NOTICE '✓ Synchronisation terminée: % technicien(s) créé(s) pour % utilisateur(s) tech', tech_count, user_count;
END $$;
