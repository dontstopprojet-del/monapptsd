/*
  # Suppression des surcharges en conflit de create_contrat_maintenance
  Supprime les deux versions existantes et recrée une seule fonction avec text pour frequence_visite
*/

DROP FUNCTION IF EXISTS create_contrat_maintenance(uuid, text, date, date, numeric, integer, text, text, uuid);
DROP FUNCTION IF EXISTS create_contrat_maintenance(uuid, text, date, date, numeric, text, text, text, uuid);

CREATE OR REPLACE FUNCTION create_contrat_maintenance(
  p_client_id uuid,
  p_type_contrat text,
  p_date_debut date,
  p_date_fin date,
  p_prix_gnf numeric,
  p_frequence_visite text,
  p_statut text,
  p_description text,
  p_created_by uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_new_id uuid;
  v_client_name text;
BEGIN
  SELECT role INTO v_role FROM app_users WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Permission refusée: rôle admin ou office requis';
  END IF;

  SELECT name INTO v_client_name FROM app_users WHERE id = p_client_id;

  INSERT INTO contrats_maintenance (
    client_id, client_name, type_contrat, date_debut, date_fin,
    prix_gnf, frequence_visite, statut, notes, created_by
  ) VALUES (
    p_client_id, v_client_name, p_type_contrat, p_date_debut, p_date_fin,
    p_prix_gnf, p_frequence_visite, p_statut, p_description, p_created_by
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;
