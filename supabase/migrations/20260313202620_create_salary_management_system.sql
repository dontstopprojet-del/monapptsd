/*
  # Salary Management System

  1. New Tables
    - `tarifs_horaires` - Hourly rates per role category
      - `id` (uuid, primary key)
      - `categorie` (text) - 'technicien' or 'employe_bureau'
      - `role` (text) - specific role name
      - `tarif_client_gnf` (numeric) - client billing rate in GNF
      - `tarif_client_eur` (numeric) - client billing rate in EUR
      - `salaire_horaire_gnf` (numeric) - employee hourly salary in GNF
      - `date_creation` (timestamptz)

    - `heures_travail` - Work hours tracking
      - `id` (uuid, primary key)
      - `employe_id` (uuid, FK to app_users)
      - `intervention_id` (uuid, FK to chantiers, nullable)
      - `date` (date) - work date
      - `nombre_heures` (numeric) - hours worked
      - `tarif_horaire_gnf` (numeric) - hourly rate snapshot
      - `total_gnf` (numeric, generated) - auto-calculated total

    - `fiches_paie` - Payslips
      - `id` (uuid, primary key)
      - `employe_id` (uuid, FK to app_users)
      - `mois` (integer) - month (1-12)
      - `annee` (integer) - year
      - `total_heures` (numeric)
      - `salaire_brut` (numeric)
      - `primes` (numeric, default 0)
      - `avances` (numeric, default 0)
      - `salaire_net` (numeric, generated) - auto-calculated

  2. Security
    - RLS enabled on all three tables
    - Admin can read/write all tables
    - Employees can read their own work hours and payslips
    - Only admin can manage tarifs_horaires

  3. Important Notes
    - total_gnf on heures_travail is computed as nombre_heures * tarif_horaire_gnf
    - salaire_net on fiches_paie is computed as salaire_brut + primes - avances
    - Default tarifs are seeded for all 14 roles
*/

-- Helper function to check admin role
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = user_id AND role = 'admin'
  );
$$;

-- Helper function to check admin or office role
CREATE OR REPLACE FUNCTION public.is_admin_or_office_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = user_id AND role IN ('admin', 'office')
  );
$$;

-- ============================================
-- TABLE: tarifs_horaires
-- ============================================
CREATE TABLE IF NOT EXISTS tarifs_horaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL CHECK (categorie IN ('technicien', 'employe_bureau')),
  role text NOT NULL,
  tarif_client_gnf numeric NOT NULL DEFAULT 0,
  tarif_client_eur numeric NOT NULL DEFAULT 0,
  salaire_horaire_gnf numeric NOT NULL DEFAULT 0,
  date_creation timestamptz DEFAULT now(),
  UNIQUE(categorie, role)
);

ALTER TABLE tarifs_horaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read tarifs"
  ON tarifs_horaires FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can insert tarifs"
  ON tarifs_horaires FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can update tarifs"
  ON tarifs_horaires FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can delete tarifs"
  ON tarifs_horaires FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Employees can read tarifs"
  ON tarifs_horaires FOR SELECT
  TO authenticated
  USING (public.is_admin_or_office_user(auth.uid()) OR EXISTS (
    SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('tech', 'office')
  ));

-- ============================================
-- TABLE: heures_travail
-- ============================================
CREATE TABLE IF NOT EXISTS heures_travail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id),
  intervention_id uuid REFERENCES chantiers(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  nombre_heures numeric NOT NULL DEFAULT 0,
  tarif_horaire_gnf numeric NOT NULL DEFAULT 0,
  total_gnf numeric GENERATED ALWAYS AS (nombre_heures * tarif_horaire_gnf) STORED,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE heures_travail ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_heures_travail_employe ON heures_travail(employe_id);
CREATE INDEX IF NOT EXISTS idx_heures_travail_date ON heures_travail(date);
CREATE INDEX IF NOT EXISTS idx_heures_travail_intervention ON heures_travail(intervention_id);

CREATE POLICY "Admin can read all work hours"
  ON heures_travail FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can insert work hours"
  ON heures_travail FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can update work hours"
  ON heures_travail FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can delete work hours"
  ON heures_travail FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Employees can read own work hours"
  ON heures_travail FOR SELECT
  TO authenticated
  USING (employe_id = auth.uid());

-- ============================================
-- TABLE: fiches_paie
-- ============================================
CREATE TABLE IF NOT EXISTS fiches_paie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id),
  mois integer NOT NULL CHECK (mois >= 1 AND mois <= 12),
  annee integer NOT NULL CHECK (annee >= 2020),
  total_heures numeric NOT NULL DEFAULT 0,
  salaire_brut numeric NOT NULL DEFAULT 0,
  primes numeric NOT NULL DEFAULT 0,
  avances numeric NOT NULL DEFAULT 0,
  salaire_net numeric GENERATED ALWAYS AS (salaire_brut + primes - avances) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employe_id, mois, annee)
);

ALTER TABLE fiches_paie ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fiches_paie_employe ON fiches_paie(employe_id);
CREATE INDEX IF NOT EXISTS idx_fiches_paie_period ON fiches_paie(annee, mois);

CREATE POLICY "Admin can read all payslips"
  ON fiches_paie FOR SELECT
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can insert payslips"
  ON fiches_paie FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can update payslips"
  ON fiches_paie FOR UPDATE
  TO authenticated
  USING (public.is_admin_user(auth.uid()))
  WITH CHECK (public.is_admin_user(auth.uid()));

CREATE POLICY "Admin can delete payslips"
  ON fiches_paie FOR DELETE
  TO authenticated
  USING (public.is_admin_user(auth.uid()));

CREATE POLICY "Employees can read own payslips"
  ON fiches_paie FOR SELECT
  TO authenticated
  USING (employe_id = auth.uid());

-- ============================================
-- SEED: Default tarifs for all roles
-- ============================================
INSERT INTO tarifs_horaires (categorie, role, tarif_client_gnf, tarif_client_eur, salaire_horaire_gnf)
VALUES
  ('technicien', 'apprenti', 50000, 5, 25000),
  ('technicien', 'manoeuvre', 75000, 8, 35000),
  ('technicien', 'manoeuvre specialise', 100000, 10, 50000),
  ('technicien', 'manoeuvre specialise d''elite', 125000, 13, 65000),
  ('technicien', 'qualifie 1er echelon', 150000, 15, 80000),
  ('technicien', 'qualifie 2e echelon', 175000, 18, 95000),
  ('technicien', 'chef d''equipe A', 200000, 20, 110000),
  ('technicien', 'chef d''equipe B', 225000, 23, 125000),
  ('technicien', 'contremaitre', 250000, 25, 140000),
  ('employe_bureau', 'directeur', 300000, 30, 200000),
  ('employe_bureau', 'responsable RH', 225000, 23, 150000),
  ('employe_bureau', 'responsable administratif et financier', 250000, 25, 170000),
  ('employe_bureau', 'secretaire / assistante administrative', 150000, 15, 100000),
  ('employe_bureau', 'comptable', 200000, 20, 130000)
ON CONFLICT (categorie, role) DO NOTHING;

-- Enable realtime for salary tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'tarifs_horaires'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE tarifs_horaires;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'heures_travail'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE heures_travail;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'fiches_paie'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE fiches_paie;
  END IF;
END $$;