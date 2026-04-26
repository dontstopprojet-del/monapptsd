/*
  # Correction du calcul d'ancienneté
  
  1. Problème
    - EXTRACT(EPOCH FROM interval) ne fonctionne pas correctement
  
  2. Solution
    - Utiliser AGE() pour calculer l'intervalle
    - Extraire les années directement
*/

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
    -- Calculer l'ancienneté en années avec 1 décimale
    CASE
      WHEN t.contract_date IS NOT NULL
      THEN ROUND(
        (EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.contract_date)) + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, t.contract_date)) / 12.0)::numeric,
        1
      )
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
    -- Calculer l'ancienneté en années avec 1 décimale
    CASE
      WHEN t.contract_date IS NOT NULL
      THEN ROUND(
        (EXTRACT(YEAR FROM AGE(CURRENT_DATE, t.contract_date)) + 
         EXTRACT(MONTH FROM AGE(CURRENT_DATE, t.contract_date)) / 12.0)::numeric,
        1
      )
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
    (t.status = 'available') DESC,
    distance_km ASC NULLS LAST,
    seniority_years DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
