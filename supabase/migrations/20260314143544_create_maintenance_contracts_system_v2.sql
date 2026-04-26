/*
  # Système de Gestion des Contrats de Maintenance (v2)

  Crée les tables et politiques RLS pour le module de gestion
  des contrats de maintenance avec visites planifiées.

  Tables: contrats_maintenance, visites_contrat
  Sécurité: RLS complet avec accès par rôle
*/

-- ============================================================
-- TABLE: contrats_maintenance
-- ============================================================
CREATE TABLE IF NOT EXISTS contrats_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  type_contrat text NOT NULL DEFAULT 'basique' CHECK (type_contrat IN ('basique', 'standard', 'premium')),
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  prix_gnf numeric(15, 0) NOT NULL DEFAULT 0,
  frequence_visite integer NOT NULL DEFAULT 1 CHECK (frequence_visite > 0 AND frequence_visite <= 52),
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'expire', 'resilie')),
  description text DEFAULT '',
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- TABLE: visites_contrat
-- ============================================================
CREATE TABLE IF NOT EXISTS visites_contrat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id uuid NOT NULL REFERENCES contrats_maintenance(id) ON DELETE CASCADE,
  technicien_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  date_visite date NOT NULL,
  date_realisation date,
  statut text NOT NULL DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'confirmee', 'en_cours', 'terminee', 'annulee')),
  rapport_intervention text DEFAULT '',
  notes_technicien text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_contrats_maintenance_client_id ON contrats_maintenance(client_id);
CREATE INDEX IF NOT EXISTS idx_contrats_maintenance_statut ON contrats_maintenance(statut);
CREATE INDEX IF NOT EXISTS idx_contrats_maintenance_date_fin ON contrats_maintenance(date_fin);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_contrat_id ON visites_contrat(contrat_id);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_technicien_id ON visites_contrat(technicien_id);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_date_visite ON visites_contrat(date_visite);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_statut ON visites_contrat(statut);

-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_contrats_maintenance_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contrats_maintenance_updated_at ON contrats_maintenance;
CREATE TRIGGER trg_contrats_maintenance_updated_at
  BEFORE UPDATE ON contrats_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_contrats_maintenance_updated_at();

CREATE OR REPLACE FUNCTION update_visites_contrat_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_visites_contrat_updated_at ON visites_contrat;
CREATE TRIGGER trg_visites_contrat_updated_at
  BEFORE UPDATE ON visites_contrat
  FOR EACH ROW EXECUTE FUNCTION update_visites_contrat_updated_at();

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE contrats_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE visites_contrat ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP existing policies if any, then recreate
-- ============================================================
DROP POLICY IF EXISTS "Admins can view all contracts" ON contrats_maintenance;
DROP POLICY IF EXISTS "Clients can view own contracts" ON contrats_maintenance;
DROP POLICY IF EXISTS "Admins can create contracts" ON contrats_maintenance;
DROP POLICY IF EXISTS "Admins can update contracts" ON contrats_maintenance;
DROP POLICY IF EXISTS "Admins can delete contracts" ON contrats_maintenance;
DROP POLICY IF EXISTS "Admins can view all visits" ON visites_contrat;
DROP POLICY IF EXISTS "Technicians can view assigned visits" ON visites_contrat;
DROP POLICY IF EXISTS "Clients can view visits of own contracts" ON visites_contrat;
DROP POLICY IF EXISTS "Admins can create visits" ON visites_contrat;
DROP POLICY IF EXISTS "Admins and assigned technicians can update visits" ON visites_contrat;
DROP POLICY IF EXISTS "Admins can delete visits" ON visites_contrat;

-- ============================================================
-- RLS POLICIES: contrats_maintenance
-- ============================================================
CREATE POLICY "Admins can view all contracts"
  ON contrats_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Clients can view own contracts"
  ON contrats_maintenance FOR SELECT
  TO authenticated
  USING (client_id = (SELECT auth.uid()));

CREATE POLICY "Admins can create contracts"
  ON contrats_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins can update contracts"
  ON contrats_maintenance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins can delete contracts"
  ON contrats_maintenance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role = 'admin'
    )
  );

-- ============================================================
-- RLS POLICIES: visites_contrat
-- ============================================================
CREATE POLICY "Admins can view all visits"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Technicians can view assigned visits"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (technicien_id = (SELECT auth.uid()));

CREATE POLICY "Clients can view visits of own contracts"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contrats_maintenance
      WHERE contrats_maintenance.id = visites_contrat.contrat_id
      AND contrats_maintenance.client_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can create visits"
  ON visites_contrat FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins and assigned technicians can update visits"
  ON visites_contrat FOR UPDATE
  TO authenticated
  USING (
    technicien_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    technicien_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins can delete visits"
  ON visites_contrat FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (SELECT auth.uid())
      AND app_users.role = 'admin'
    )
  );

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'contrats_maintenance'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE contrats_maintenance;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'visites_contrat'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE visites_contrat;
  END IF;
END $$;
