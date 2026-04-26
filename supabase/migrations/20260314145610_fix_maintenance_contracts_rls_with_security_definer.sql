/*
  # Fix RLS pour contrats_maintenance - Fonction SECURITY DEFINER

  Problème: Les politiques RLS bloquent la création car certains auth.uid()
  n'ont pas de correspondance dans app_users, ou les doublons de politiques
  causent des conflits.

  Solution: Supprimer toutes les politiques en double, et créer une fonction
  SECURITY DEFINER pour la création de contrats (comme les autres modules).
*/

-- ============================================================
-- Supprimer TOUTES les politiques existantes sur les deux tables
-- ============================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'contrats_maintenance' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON contrats_maintenance', pol.policyname);
  END LOOP;
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'visites_contrat' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON visites_contrat', pol.policyname);
  END LOOP;
END $$;

-- ============================================================
-- Recréer les politiques propres pour contrats_maintenance
-- ============================================================

-- Admins et office: voir tous les contrats
CREATE POLICY "admin_office_select_contracts"
  ON contrats_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Clients: voir leurs propres contrats
CREATE POLICY "client_select_own_contracts"
  ON contrats_maintenance FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- Admins et office: modifier les contrats
CREATE POLICY "admin_office_update_contracts"
  ON contrats_maintenance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Admins: supprimer les contrats
CREATE POLICY "admin_delete_contracts"
  ON contrats_maintenance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- ============================================================
-- Politiques pour visites_contrat
-- ============================================================

-- Admins et office: voir toutes les visites
CREATE POLICY "admin_office_select_visits"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Techniciens: voir leurs visites assignées
CREATE POLICY "tech_select_own_visits"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (technicien_id = auth.uid());

-- Clients: voir les visites de leurs contrats
CREATE POLICY "client_select_contract_visits"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contrats_maintenance
      WHERE contrats_maintenance.id = visites_contrat.contrat_id
      AND contrats_maintenance.client_id = auth.uid()
    )
  );

-- Admins et office: modifier les visites
CREATE POLICY "admin_office_update_visits"
  ON visites_contrat FOR UPDATE
  TO authenticated
  USING (
    technicien_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    technicien_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

-- Admins: supprimer les visites
CREATE POLICY "admin_delete_visits"
  ON visites_contrat FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- ============================================================
-- Fonction SECURITY DEFINER pour créer un contrat
-- (contourne le RLS côté INSERT, vérifie le rôle en interne)
-- ============================================================
CREATE OR REPLACE FUNCTION create_contrat_maintenance(
  p_client_id uuid,
  p_type_contrat text,
  p_date_debut date,
  p_date_fin date,
  p_prix_gnf numeric,
  p_frequence_visite integer,
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
BEGIN
  -- Vérifier que l'appelant est admin ou office
  SELECT role INTO v_role FROM app_users WHERE id = auth.uid();
  IF v_role NOT IN ('admin', 'office') THEN
    RAISE EXCEPTION 'Permission refusée: rôle admin ou office requis';
  END IF;

  INSERT INTO contrats_maintenance (
    client_id, type_contrat, date_debut, date_fin,
    prix_gnf, frequence_visite, statut, description, created_by
  ) VALUES (
    p_client_id, p_type_contrat, p_date_debut, p_date_fin,
    p_prix_gnf, p_frequence_visite, p_statut, p_description, p_created_by
  )
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

-- ============================================================
-- Fonction SECURITY DEFINER pour planifier les visites
-- ============================================================
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
