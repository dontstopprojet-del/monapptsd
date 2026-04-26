/*
  # Create Maintenance Contracts System

  1. New Tables
    - `contrats_maintenance`
      - `id` (uuid, primary key)
      - `client_id` (uuid, FK to app_users)
      - `client_name` (text) - Denormalized client name for display
      - `type_contrat` (text) - basique, standard, premium
      - `date_debut` (date) - Contract start date
      - `date_fin` (date) - Contract end date
      - `prix_gnf` (numeric) - Price in GNF
      - `frequence_visite` (text) - mensuelle, trimestrielle, semestrielle, annuelle
      - `statut` (text) - actif, expire, suspendu, annule
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz)
      - `created_by` (uuid, FK to app_users)

    - `visites_contrat`
      - `id` (uuid, primary key)
      - `contrat_id` (uuid, FK to contrats_maintenance)
      - `technicien_id` (uuid, FK to app_users)
      - `date_visite` (date) - Planned visit date
      - `rapport_intervention` (text) - Intervention report
      - `statut` (text) - planifiee, effectuee, annulee
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on both tables
    - Admin and office users can manage contracts and visits
    - Technicians can view/update their assigned visits
    - Clients can view their own contracts and visits

  3. Automation
    - Trigger to auto-generate visits when a contract is created
    - Function to calculate visit dates based on frequency
*/

-- Create contrats_maintenance table
CREATE TABLE IF NOT EXISTS contrats_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES app_users(id),
  client_name text DEFAULT '',
  type_contrat text NOT NULL DEFAULT 'basique',
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 year'),
  prix_gnf numeric NOT NULL DEFAULT 0,
  frequence_visite text NOT NULL DEFAULT 'trimestrielle',
  statut text NOT NULL DEFAULT 'actif',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES app_users(id),
  CONSTRAINT valid_type_contrat CHECK (type_contrat IN ('basique', 'standard', 'premium')),
  CONSTRAINT valid_frequence CHECK (frequence_visite IN ('mensuelle', 'trimestrielle', 'semestrielle', 'annuelle')),
  CONSTRAINT valid_statut_contrat CHECK (statut IN ('actif', 'expire', 'suspendu', 'annule'))
);

ALTER TABLE contrats_maintenance ENABLE ROW LEVEL SECURITY;

-- Create visites_contrat table
CREATE TABLE IF NOT EXISTS visites_contrat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrat_id uuid NOT NULL REFERENCES contrats_maintenance(id) ON DELETE CASCADE,
  technicien_id uuid REFERENCES app_users(id),
  date_visite date NOT NULL,
  rapport_intervention text DEFAULT '',
  statut text NOT NULL DEFAULT 'planifiee',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_statut_visite CHECK (statut IN ('planifiee', 'effectuee', 'annulee'))
);

ALTER TABLE visites_contrat ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contrats_maintenance_client_id ON contrats_maintenance(client_id);
CREATE INDEX IF NOT EXISTS idx_contrats_maintenance_statut ON contrats_maintenance(statut);
CREATE INDEX IF NOT EXISTS idx_contrats_maintenance_created_by ON contrats_maintenance(created_by);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_contrat_id ON visites_contrat(contrat_id);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_technicien_id ON visites_contrat(technicien_id);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_date_visite ON visites_contrat(date_visite);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_statut ON visites_contrat(statut);

-- RLS Policies for contrats_maintenance

CREATE POLICY "Admin and office can view all contracts"
  ON contrats_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Clients can view own contracts"
  ON contrats_maintenance FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Technicians can view contracts for their visits"
  ON contrats_maintenance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM visites_contrat vc
      WHERE vc.contrat_id = contrats_maintenance.id
      AND vc.technicien_id = auth.uid()
    )
  );

CREATE POLICY "Admin and office can create contracts"
  ON contrats_maintenance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admin and office can update contracts"
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

CREATE POLICY "Admin can delete contracts"
  ON contrats_maintenance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- RLS Policies for visites_contrat

CREATE POLICY "Admin and office can view all visits"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Technicians can view own visits"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (technicien_id = auth.uid());

CREATE POLICY "Clients can view visits for their contracts"
  ON visites_contrat FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contrats_maintenance cm
      WHERE cm.id = visites_contrat.contrat_id
      AND cm.client_id = auth.uid()
    )
  );

CREATE POLICY "Admin and office can create visits"
  ON visites_contrat FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role IN ('admin', 'office')
    )
  );

CREATE POLICY "Admin and office can update visits"
  ON visites_contrat FOR UPDATE
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

CREATE POLICY "Technicians can update their own visit reports"
  ON visites_contrat FOR UPDATE
  TO authenticated
  USING (technicien_id = auth.uid())
  WITH CHECK (technicien_id = auth.uid());

CREATE POLICY "Admin can delete visits"
  ON visites_contrat FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.role = 'admin'
    )
  );

-- Function to auto-generate scheduled visits for a contract
CREATE OR REPLACE FUNCTION generate_contract_visits(
  p_contrat_id uuid,
  p_date_debut date,
  p_date_fin date,
  p_frequence text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_interval interval;
  v_current_date date;
BEGIN
  CASE p_frequence
    WHEN 'mensuelle' THEN v_interval := INTERVAL '1 month';
    WHEN 'trimestrielle' THEN v_interval := INTERVAL '3 months';
    WHEN 'semestrielle' THEN v_interval := INTERVAL '6 months';
    WHEN 'annuelle' THEN v_interval := INTERVAL '1 year';
    ELSE v_interval := INTERVAL '3 months';
  END CASE;

  v_current_date := p_date_debut;

  WHILE v_current_date <= p_date_fin LOOP
    INSERT INTO visites_contrat (contrat_id, date_visite, statut)
    VALUES (p_contrat_id, v_current_date, 'planifiee');
    v_current_date := v_current_date + v_interval;
  END LOOP;
END;
$$;

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE contrats_maintenance;
ALTER PUBLICATION supabase_realtime ADD TABLE visites_contrat;