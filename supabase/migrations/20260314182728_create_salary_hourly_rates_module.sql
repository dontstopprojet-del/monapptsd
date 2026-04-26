/*
  # Salary & Hourly Rates Module

  ## Overview
  Creates the complete salary management system with three tables:
  - tarifs_horaires: Hourly rates by role/category
  - heures_travail: Worked hours tracking per employee
  - fiches_paie: Monthly payslips

  ## New Tables

  ### tarifs_horaires
  - id (uuid, pk)
  - categorie: 'technicien' | 'employe_bureau'
  - role: specific role name
  - tarif_client_gnf: hourly rate billed to clients (GNF)
  - tarif_client_eur: hourly rate billed to clients (EUR)
  - salaire_horaire_gnf: internal hourly wage paid to employee (GNF)
  - date_creation: timestamp

  ### heures_travail
  - id (uuid, pk)
  - employe_id: FK to app_users
  - intervention_id: optional FK to chantiers
  - date: work date
  - nombre_heures: number of hours worked
  - tarif_horaire_gnf: wage rate applied
  - total_gnf: auto-calculated (nombre_heures × tarif_horaire_gnf)

  ### fiches_paie
  - id (uuid, pk)
  - employe_id: FK to app_users
  - mois: month (1-12)
  - annee: year
  - total_heures: total hours that month
  - salaire_brut: gross salary
  - primes: bonuses
  - avances: salary advances
  - salaire_net: auto-calculated (salaire_brut + primes - avances)

  ## Security
  - RLS enabled on all tables
  - Admins/office staff can read and write all records
  - Employees can only read their own records

  ## Notes
  1. total_gnf computed via trigger on heures_travail
  2. salaire_net computed via trigger on fiches_paie
  3. Seed data provided for all technician and office employee roles
*/

-- =========================================================
-- TABLE: tarifs_horaires
-- =========================================================
CREATE TABLE IF NOT EXISTS tarifs_horaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL CHECK (categorie IN ('technicien', 'employe_bureau')),
  role text NOT NULL,
  tarif_client_gnf numeric(15, 2) NOT NULL DEFAULT 0,
  tarif_client_eur numeric(10, 2) NOT NULL DEFAULT 0,
  salaire_horaire_gnf numeric(15, 2) NOT NULL DEFAULT 0,
  date_creation timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categorie, role)
);

ALTER TABLE tarifs_horaires ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and office can manage tarifs_horaires"
  ON tarifs_horaires FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins and office can insert tarifs_horaires"
  ON tarifs_horaires FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins and office can update tarifs_horaires"
  ON tarifs_horaires FOR UPDATE
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

CREATE POLICY "Admins and office can delete tarifs_horaires"
  ON tarifs_horaires FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
  );

-- =========================================================
-- TABLE: heures_travail
-- =========================================================
CREATE TABLE IF NOT EXISTS heures_travail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  intervention_id uuid REFERENCES chantiers(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  nombre_heures numeric(6, 2) NOT NULL DEFAULT 0,
  tarif_horaire_gnf numeric(15, 2) NOT NULL DEFAULT 0,
  total_gnf numeric(15, 2) GENERATED ALWAYS AS (nombre_heures * tarif_horaire_gnf) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE heures_travail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and office can select heures_travail"
  ON heures_travail FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
    OR employe_id = (SELECT id FROM app_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins and office can insert heures_travail"
  ON heures_travail FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins and office can update heures_travail"
  ON heures_travail FOR UPDATE
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

CREATE POLICY "Admins and office can delete heures_travail"
  ON heures_travail FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
  );

-- =========================================================
-- TABLE: fiches_paie
-- =========================================================
CREATE TABLE IF NOT EXISTS fiches_paie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  mois smallint NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee smallint NOT NULL CHECK (annee > 2000),
  total_heures numeric(8, 2) NOT NULL DEFAULT 0,
  salaire_brut numeric(15, 2) NOT NULL DEFAULT 0,
  primes numeric(15, 2) NOT NULL DEFAULT 0,
  avances numeric(15, 2) NOT NULL DEFAULT 0,
  salaire_net numeric(15, 2) GENERATED ALWAYS AS (salaire_brut + primes - avances) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (employe_id, mois, annee)
);

ALTER TABLE fiches_paie ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and office can select fiches_paie"
  ON fiches_paie FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
    OR employe_id = (SELECT id FROM app_users WHERE id = auth.uid())
  );

CREATE POLICY "Admins and office can insert fiches_paie"
  ON fiches_paie FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admins and office can update fiches_paie"
  ON fiches_paie FOR UPDATE
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

CREATE POLICY "Admins and office can delete fiches_paie"
  ON fiches_paie FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
        AND app_users.role IN ('admin', 'office')
    )
  );

-- =========================================================
-- Realtime
-- =========================================================
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

-- =========================================================
-- SEED: Default hourly rates for all roles
-- =========================================================
INSERT INTO tarifs_horaires (categorie, role, tarif_client_gnf, tarif_client_eur, salaire_horaire_gnf)
VALUES
  -- Technicians
  ('technicien', 'apprenti',                        50000,   5.00,  25000),
  ('technicien', 'manoeuvre',                       70000,   7.00,  35000),
  ('technicien', 'manoeuvre_specialise',            90000,   9.00,  45000),
  ('technicien', 'manoeuvre_specialise_elite',     110000,  11.00,  55000),
  ('technicien', 'qualifie_niveau_1',              130000,  13.00,  65000),
  ('technicien', 'qualifie_niveau_2',              150000,  15.00,  75000),
  ('technicien', 'chef_equipe_A',                  180000,  18.00,  90000),
  ('technicien', 'chef_equipe_B',                  160000,  16.00,  80000),
  ('technicien', 'contremaitre',                   200000,  20.00, 100000),
  -- Office employees
  ('employe_bureau', 'directeur',                  300000,  30.00, 150000),
  ('employe_bureau', 'responsable_RH',             200000,  20.00, 100000),
  ('employe_bureau', 'responsable_administratif_financier', 220000, 22.00, 110000),
  ('employe_bureau', 'secretaire_assistante_administrative', 150000, 15.00, 75000),
  ('employe_bureau', 'comptable',                  180000,  18.00,  90000)
ON CONFLICT (categorie, role) DO NOTHING;
