/*
  # Garantir des données complètes et exactes pour tous les techniciens
  
  1. Objectif
    - S'assurer que tous les techniciens ont des données complètes
    - Initialiser automatiquement les valeurs par défaut
    - Garantir la cohérence des données
  
  2. Fonctionnalités
    - Fonction pour initialiser les données manquantes
    - Trigger automatique lors de la création d'un technicien
    - Valeurs par défaut cohérentes et exactes
  
  3. Données garanties
    - completed_jobs: 0 (nouveau technicien)
    - absence_count: 0 (aucune absence au départ)
    - sick_leave_count: 0 (aucune maladie au départ)
    - complaint_count: 0 (aucune plainte au départ)
    - satisfaction_rate: 100 (satisfaction par défaut)
    - status: 'Dispo' (disponible par défaut)
*/

-- Fonction pour initialiser les données d'un technicien
CREATE OR REPLACE FUNCTION initialize_technician_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Initialiser les compteurs à 0 s'ils sont NULL
  IF NEW.completed_jobs IS NULL THEN
    NEW.completed_jobs := 0;
  END IF;
  
  IF NEW.absence_count IS NULL THEN
    NEW.absence_count := 0;
  END IF;
  
  IF NEW.sick_leave_count IS NULL THEN
    NEW.sick_leave_count := 0;
  END IF;
  
  IF NEW.complaint_count IS NULL THEN
    NEW.complaint_count := 0;
  END IF;
  
  -- Initialiser le taux de satisfaction à 100%
  IF NEW.satisfaction_rate IS NULL THEN
    NEW.satisfaction_rate := 100;
  END IF;
  
  -- Initialiser le statut à 'Dispo'
  IF NEW.status IS NULL OR NEW.status = '' THEN
    NEW.status := 'Dispo';
  END IF;
  
  -- Initialiser la date de contrat depuis app_users si disponible
  IF NEW.contract_date IS NULL AND NEW.profile_id IS NOT NULL THEN
    SELECT contract_date INTO NEW.contract_date
    FROM app_users
    WHERE id = NEW.profile_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour initialiser automatiquement les données
DROP TRIGGER IF EXISTS trigger_initialize_technician_data ON technicians;
CREATE TRIGGER trigger_initialize_technician_data
  BEFORE INSERT OR UPDATE ON technicians
  FOR EACH ROW
  EXECUTE FUNCTION initialize_technician_data();

-- Mettre à jour les techniciens existants pour s'assurer qu'ils ont des données complètes
UPDATE technicians
SET 
  completed_jobs = COALESCE(completed_jobs, 0),
  absence_count = COALESCE(absence_count, 0),
  sick_leave_count = COALESCE(sick_leave_count, 0),
  complaint_count = COALESCE(complaint_count, 0),
  satisfaction_rate = COALESCE(satisfaction_rate, 100),
  status = COALESCE(NULLIF(status, ''), 'Dispo')
WHERE 
  completed_jobs IS NULL 
  OR absence_count IS NULL 
  OR sick_leave_count IS NULL 
  OR complaint_count IS NULL
  OR satisfaction_rate IS NULL
  OR status IS NULL
  OR status = '';

-- Fonction pour valider les données d'un technicien
CREATE OR REPLACE FUNCTION validate_technician_data(p_technician_id uuid)
RETURNS TABLE (
  field_name text,
  current_value text,
  status text,
  recommendation text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Nom'::text,
    COALESCE(au.name, 'N/A')::text,
    CASE WHEN au.name IS NOT NULL AND au.name != '' THEN '✅ OK' ELSE '❌ Manquant' END::text,
    CASE WHEN au.name IS NULL OR au.name = '' THEN 'Ajouter le nom du technicien' ELSE 'RAS' END::text
  FROM technicians t
  LEFT JOIN app_users au ON au.id = t.profile_id
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Adresse domicile'::text,
    COALESCE(t.home_address, 'N/A')::text,
    CASE WHEN t.home_address IS NOT NULL AND t.home_address != '' THEN '✅ OK' ELSE '⚠️ Recommandé' END::text,
    CASE WHEN t.home_address IS NULL OR t.home_address = '' THEN 'Ajouter l''adresse pour optimiser les déplacements' ELSE 'RAS' END::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Coordonnées GPS'::text,
    CASE 
      WHEN t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL 
      THEN t.home_lat::text || ', ' || t.home_lng::text
      ELSE 'N/A'
    END::text,
    CASE WHEN t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL THEN '✅ OK' ELSE '⚠️ Recommandé' END::text,
    CASE WHEN t.home_lat IS NULL OR t.home_lng IS NULL THEN 'Ajouter les coordonnées GPS pour calculer les distances' ELSE 'RAS' END::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Date de contrat'::text,
    COALESCE(t.contract_date::text, 'N/A')::text,
    CASE WHEN t.contract_date IS NOT NULL THEN '✅ OK' ELSE '⚠️ Recommandé' END::text,
    CASE WHEN t.contract_date IS NULL THEN 'Ajouter la date de contrat pour calculer l''ancienneté' ELSE 'RAS' END::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Projets réalisés'::text,
    COALESCE(t.completed_jobs::text, '0')::text,
    '✅ OK'::text,
    'Mis à jour automatiquement'::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Absences'::text,
    COALESCE(t.absence_count::text, '0')::text,
    '✅ OK'::text,
    'Mis à jour manuellement'::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Congés maladie'::text,
    COALESCE(t.sick_leave_count::text, '0')::text,
    '✅ OK'::text,
    'Mis à jour manuellement'::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Plaintes'::text,
    COALESCE(t.complaint_count::text, '0')::text,
    '✅ OK'::text,
    'Mis à jour automatiquement'::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Taux de satisfaction'::text,
    COALESCE(t.satisfaction_rate::text || '%', '100%')::text,
    '✅ OK'::text,
    'Calculé automatiquement'::text
  FROM technicians t
  WHERE t.id = p_technician_id
  
  UNION ALL
  
  SELECT 
    'Statut'::text,
    COALESCE(t.status, 'Dispo')::text,
    '✅ OK'::text,
    'Mis à jour automatiquement'::text
  FROM technicians t
  WHERE t.id = p_technician_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir un rapport complet sur tous les techniciens
CREATE OR REPLACE FUNCTION get_all_technicians_data_report()
RETURNS TABLE (
  technician_id uuid,
  technician_name text,
  has_complete_data boolean,
  missing_fields text[],
  recommended_actions text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as technician_id,
    COALESCE(au.name, 'Technicien sans nom') as technician_name,
    (
      au.name IS NOT NULL AND au.name != '' AND
      t.home_address IS NOT NULL AND t.home_address != '' AND
      t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL AND
      t.contract_date IS NOT NULL AND
      t.completed_jobs IS NOT NULL AND
      t.absence_count IS NOT NULL AND
      t.sick_leave_count IS NOT NULL AND
      t.complaint_count IS NOT NULL AND
      t.satisfaction_rate IS NOT NULL AND
      t.status IS NOT NULL AND t.status != ''
    ) as has_complete_data,
    ARRAY(
      SELECT unnest(ARRAY[
        CASE WHEN au.name IS NULL OR au.name = '' THEN 'Nom' ELSE NULL END,
        CASE WHEN t.home_address IS NULL OR t.home_address = '' THEN 'Adresse' ELSE NULL END,
        CASE WHEN t.home_lat IS NULL OR t.home_lng IS NULL THEN 'GPS' ELSE NULL END,
        CASE WHEN t.contract_date IS NULL THEN 'Date de contrat' ELSE NULL END
      ])
      WHERE unnest IS NOT NULL
    ) as missing_fields,
    ARRAY(
      SELECT unnest(ARRAY[
        CASE WHEN au.name IS NULL OR au.name = '' THEN 'Ajouter le nom' ELSE NULL END,
        CASE WHEN t.home_address IS NULL OR t.home_address = '' THEN 'Ajouter l''adresse' ELSE NULL END,
        CASE WHEN t.home_lat IS NULL OR t.home_lng IS NULL THEN 'Ajouter coordonnées GPS' ELSE NULL END,
        CASE WHEN t.contract_date IS NULL THEN 'Ajouter date de contrat' ELSE NULL END
      ])
      WHERE unnest IS NOT NULL
    ) as recommended_actions
  FROM technicians t
  LEFT JOIN app_users au ON au.id = t.profile_id
  ORDER BY has_complete_data DESC, au.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
