/*
  # Correction des fonctions RPC pour correspondre au schéma réel

  La table contrats_maintenance existait déjà avec:
  - notes (pas description)
  - frequence_visite en text (pas integer)
  - client_name (colonne supplémentaire)

  La table visites_contrat n'a pas: date_realisation, notes_technicien, updated_at
*/

-- Recréer la fonction create_contrat_maintenance avec le bon schéma
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

-- Recréer la fonction create_visites_contrat avec le bon schéma
CREATE OR REPLACE FUNCTION create_visites_contrat(
  p_contrat_id uuid,
  p_dates date[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_date date;
BEGIN
  SELECT role INTO v_role FROM app_users WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Permission refusée: rôle admin ou office requis';
  END IF;

  FOREACH v_date IN ARRAY p_dates LOOP
    INSERT INTO visites_contrat (contrat_id, date_visite, statut)
    VALUES (p_contrat_id, v_date, 'planifiee');
  END LOOP;
END;
$$;
