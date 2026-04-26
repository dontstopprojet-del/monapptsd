/*
  # Recréation de la fonction de rapport des techniciens
  
  Supprime et recrée la fonction avec la bonne signature
*/

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS get_all_technicians_data_report();

-- Créer la nouvelle fonction
CREATE OR REPLACE FUNCTION get_all_technicians_data_report()
RETURNS TABLE (
  technician_id uuid,
  technician_name text,
  has_name boolean,
  has_address boolean,
  has_gps boolean,
  has_contract_date boolean,
  has_complete_data boolean,
  completeness_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as technician_id,
    COALESCE(au.name, 'Technicien sans nom') as technician_name,
    (au.name IS NOT NULL AND au.name != '') as has_name,
    (t.home_address IS NOT NULL AND t.home_address != '') as has_address,
    (t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL) as has_gps,
    (t.contract_date IS NOT NULL) as has_contract_date,
    (
      au.name IS NOT NULL AND au.name != '' AND
      t.home_address IS NOT NULL AND t.home_address != '' AND
      t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL AND
      t.contract_date IS NOT NULL
    ) as has_complete_data,
    ROUND(
      (
        CASE WHEN au.name IS NOT NULL AND au.name != '' THEN 25 ELSE 0 END +
        CASE WHEN t.home_address IS NOT NULL AND t.home_address != '' THEN 25 ELSE 0 END +
        CASE WHEN t.home_lat IS NOT NULL AND t.home_lng IS NOT NULL THEN 25 ELSE 0 END +
        CASE WHEN t.contract_date IS NOT NULL THEN 25 ELSE 0 END
      )::numeric,
      0
    ) as completeness_score
  FROM technicians t
  LEFT JOIN app_users au ON au.id = t.profile_id
  ORDER BY 
    has_complete_data DESC,
    completeness_score DESC,
    au.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
