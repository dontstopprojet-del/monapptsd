/*
  # Ajout des informations détaillées des techniciens pour le planning
  
  1. Objectif
    - Afficher les informations complètes des techniciens lors de la sélection dans le planning
    - Calculer la distance entre le domicile du technicien et le chantier
    - Afficher ancienneté, projets réalisés, absences, maladies, plaintes
  
  2. Fonctionnalités
    - Fonction de calcul de distance GPS (formule de Haversine)
    - Fonction pour obtenir les informations enrichies des techniciens
    - Calcul automatique de l'ancienneté en années
  
  3. Données affichées
    - Distance domicile → chantier (en km)
    - Ancienneté (en années)
    - Nombre de projets réalisés
    - Nombre d'absences
    - Nombre de congés maladie
    - Nombre de plaintes
*/

-- Fonction pour calculer la distance entre deux points GPS (formule de Haversine)
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
)
RETURNS numeric AS $$
DECLARE
  earth_radius numeric := 6371; -- Rayon de la Terre en km
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  -- Vérifier que toutes les coordonnées sont présentes
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convertir les degrés en radians
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  -- Formule de Haversine
  a := sin(dlat/2) * sin(dlat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  -- Distance en kilomètres, arrondie à 2 décimales
  RETURN ROUND((earth_radius * c)::numeric, 2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour obtenir les informations détaillées d'un technicien pour un chantier donné
CREATE OR REPLACE FUNCTION get_technician_detailed_info_for_planning(
  p_technician_id uuid,
  p_chantier_id uuid DEFAULT NULL
)
RETURNS TABLE (
  technician_id uuid,
  technician_name text,
  status text,
  role_level text,
  distance_km numeric,
  seniority_years numeric,
  completed_jobs integer,
  absence_count integer,
  sick_leave_count integer,
  complaint_count integer,
  satisfaction_rate integer,
  home_address text,
  home_lat numeric,
  home_lng numeric,
  contract_date date
) AS $$
DECLARE
  v_chantier_lat numeric;
  v_chantier_lng numeric;
BEGIN
  -- Si un chantier est spécifié, récupérer ses coordonnées
  IF p_chantier_id IS NOT NULL THEN
    SELECT location_lat, location_lng
    INTO v_chantier_lat, v_chantier_lng
    FROM chantiers
    WHERE id = p_chantier_id;
  END IF;
  
  RETURN QUERY
  SELECT
    t.id as technician_id,
    au.name as technician_name,
    t.status,
    t.role_level,
    -- Calculer la distance si le chantier et les coordonnées sont disponibles
    CASE 
      WHEN p_chantier_id IS NOT NULL AND t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL 
           AND v_chantier_lat IS NOT NULL AND v_chantier_lng IS NOT NULL
      THEN calculate_distance_km(t.home_lat, t.home_lng, v_chantier_lat, v_chantier_lng)
      ELSE NULL
    END as distance_km,
    -- Calculer l'ancienneté en années (avec décimales)
    CASE
      WHEN t.contract_date IS NOT NULL
      THEN ROUND((EXTRACT(EPOCH FROM (CURRENT_DATE - t.contract_date)) / 31536000)::numeric, 1)
      ELSE 0
    END as seniority_years,
    COALESCE(t.completed_jobs, 0) as completed_jobs,
    COALESCE(t.absence_count, 0) as absence_count,
    COALESCE(t.sick_leave_count, 0) as sick_leave_count,
    COALESCE(t.complaint_count, 0) as complaint_count,
    t.satisfaction_rate,
    t.home_address,
    t.home_lat,
    t.home_lng,
    t.contract_date
  FROM technicians t
  LEFT JOIN app_users au ON au.id = t.profile_id
  WHERE t.id = p_technician_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir tous les techniciens avec leurs informations détaillées pour un chantier
CREATE OR REPLACE FUNCTION get_all_technicians_for_chantier(p_chantier_id uuid)
RETURNS TABLE (
  technician_id uuid,
  technician_name text,
  status text,
  role_level text,
  distance_km numeric,
  seniority_years numeric,
  completed_jobs integer,
  absence_count integer,
  sick_leave_count integer,
  complaint_count integer,
  satisfaction_rate integer,
  home_address text,
  color text,
  is_available boolean
) AS $$
DECLARE
  v_chantier_lat numeric;
  v_chantier_lng numeric;
BEGIN
  -- Récupérer les coordonnées du chantier
  SELECT location_lat, location_lng
  INTO v_chantier_lat, v_chantier_lng
  FROM chantiers
  WHERE id = p_chantier_id;
  
  RETURN QUERY
  SELECT
    t.id as technician_id,
    au.name as technician_name,
    t.status,
    t.role_level,
    -- Calculer la distance
    CASE 
      WHEN t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL 
           AND v_chantier_lat IS NOT NULL AND v_chantier_lng IS NOT NULL
      THEN calculate_distance_km(t.home_lat, t.home_lng, v_chantier_lat, v_chantier_lng)
      ELSE NULL
    END as distance_km,
    -- Calculer l'ancienneté
    CASE
      WHEN t.contract_date IS NOT NULL
      THEN ROUND((EXTRACT(EPOCH FROM (CURRENT_DATE - t.contract_date)) / 31536000)::numeric, 1)
      ELSE 0
    END as seniority_years,
    COALESCE(t.completed_jobs, 0) as completed_jobs,
    COALESCE(t.absence_count, 0) as absence_count,
    COALESCE(t.sick_leave_count, 0) as sick_leave_count,
    COALESCE(t.complaint_count, 0) as complaint_count,
    t.satisfaction_rate,
    t.home_address,
    t.color,
    (t.status = 'available') as is_available
  FROM technicians t
  LEFT JOIN app_users au ON au.id = t.profile_id
  WHERE t.profile_id IS NOT NULL
  ORDER BY 
    -- Trier par disponibilité d'abord, puis par distance
    is_available DESC,
    distance_km ASC NULLS LAST,
    seniority_years DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Index pour améliorer les performances de calcul de distance
CREATE INDEX IF NOT EXISTS idx_technicians_home_coords ON technicians(home_lat, home_lng);
CREATE INDEX IF NOT EXISTS idx_chantiers_location_coords ON chantiers(location_lat, location_lng);
