/*
  # Create Installation History, Technician Evaluations, and Emergency Management modules

  1. New Tables
    - `installations_client` - tracks plumbing installations at client locations
      - `id` (uuid, primary key)
      - `client_id` (uuid, FK to app_users)
      - `type_installation` (text) - lavabo, WC, chauffe-eau, canalisation, etc.
      - `marque_equipement` (text)
      - `date_installation` (date)
      - `duree_garantie` (integer, months)
      - `notes` (text)
      - `photos` (text[])

    - `historique_interventions_installation` - intervention history linked to installations
      - `id` (uuid, primary key)
      - `intervention_id` (uuid, FK to chantiers)
      - `installation_id` (uuid, FK to installations_client)
      - `technicien_id` (uuid, FK to app_users)
      - `rapport_technique` (text)
      - `photos` (text[])
      - `date_intervention` (date)

    - `evaluations_techniciens` - client ratings of technician service quality
      - `id` (uuid, primary key)
      - `intervention_id` (uuid, FK to chantiers)
      - `client_id` (uuid, FK to app_users)
      - `technicien_id` (uuid, FK to app_users)
      - `note` (integer, 1-5)
      - `commentaire` (text)

    - `urgences` - client-reported emergencies
      - `id` (uuid, primary key)
      - `client_id` (uuid, FK to app_users)
      - `description_probleme` (text)
      - `niveau_urgence` (text: faible/moyen/critique)
      - `statut` (text: en_attente/assigne/resolu)
      - `technicien_id` (uuid, FK to app_users, nullable)

  2. Security
    - RLS enabled on all 4 tables
    - Admin/office: full read access, insert/update/delete
    - Technicians: read installations for assigned clients, manage intervention history
    - Clients: read own installations, create evaluations, create/read emergencies

  3. Triggers
    - Auto-update updated_at on urgences and installations_client
    - Auto-notify technician when assigned to an emergency
*/

-- =============================================
-- TABLE 1: installations_client
-- =============================================
CREATE TABLE IF NOT EXISTS installations_client (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  type_installation text NOT NULL DEFAULT '',
  marque_equipement text DEFAULT '',
  date_installation date DEFAULT CURRENT_DATE,
  duree_garantie integer DEFAULT 0,
  notes text DEFAULT '',
  photos text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE installations_client ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_installations_client_client_id ON installations_client(client_id);

CREATE POLICY "Admin can manage all installations"
  ON installations_client FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')));

CREATE POLICY "Admin can insert installations"
  ON installations_client FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office', 'tech')));

CREATE POLICY "Admin can update installations"
  ON installations_client FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office', 'tech')))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office', 'tech')));

CREATE POLICY "Admin can delete installations"
  ON installations_client FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')));

CREATE POLICY "Technicians can view client installations"
  ON installations_client FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'tech')
    AND (
      EXISTS (SELECT 1 FROM planning_technicians pt JOIN planning p ON pt.planning_id = p.id JOIN chantiers c ON p.chantier_id = c.id WHERE pt.technician_id = auth.uid() AND c.client_id = installations_client.client_id)
      OR EXISTS (SELECT 1 FROM chantiers c WHERE c.technician_id = auth.uid() AND c.client_id = installations_client.client_id)
    )
  );

CREATE POLICY "Clients can view own installations"
  ON installations_client FOR SELECT TO authenticated
  USING (client_id = auth.uid());


-- =============================================
-- TABLE 2: historique_interventions_installation
-- =============================================
CREATE TABLE IF NOT EXISTS historique_interventions_installation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid REFERENCES chantiers(id) ON DELETE SET NULL,
  installation_id uuid NOT NULL REFERENCES installations_client(id) ON DELETE CASCADE,
  technicien_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  rapport_technique text DEFAULT '',
  photos text[] DEFAULT '{}',
  date_intervention date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE historique_interventions_installation ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_hist_interv_installation_id ON historique_interventions_installation(installation_id);
CREATE INDEX IF NOT EXISTS idx_hist_interv_intervention_id ON historique_interventions_installation(intervention_id);
CREATE INDEX IF NOT EXISTS idx_hist_interv_technicien_id ON historique_interventions_installation(technicien_id);

CREATE POLICY "Admin can view all intervention history"
  ON historique_interventions_installation FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')));

CREATE POLICY "Admin can insert intervention history"
  ON historique_interventions_installation FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office', 'tech')));

CREATE POLICY "Admin can update intervention history"
  ON historique_interventions_installation FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office', 'tech')))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office', 'tech')));

CREATE POLICY "Admin can delete intervention history"
  ON historique_interventions_installation FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')));

CREATE POLICY "Technicians can view intervention history"
  ON historique_interventions_installation FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'tech')
    AND (
      technicien_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM installations_client ic
        JOIN chantiers c ON c.client_id = ic.client_id
        WHERE ic.id = historique_interventions_installation.installation_id
        AND (c.technician_id = auth.uid() OR EXISTS (SELECT 1 FROM planning_technicians pt JOIN planning p ON pt.planning_id = p.id WHERE pt.technician_id = auth.uid() AND p.chantier_id = c.id))
      )
    )
  );

CREATE POLICY "Clients can view own intervention history"
  ON historique_interventions_installation FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM installations_client ic WHERE ic.id = historique_interventions_installation.installation_id AND ic.client_id = auth.uid()));


-- =============================================
-- TABLE 3: evaluations_techniciens
-- =============================================
CREATE TABLE IF NOT EXISTS evaluations_techniciens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id uuid NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  technicien_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  note integer NOT NULL CHECK (note >= 1 AND note <= 5),
  commentaire text DEFAULT '',
  date timestamptz DEFAULT now(),
  CONSTRAINT unique_evaluation_per_intervention UNIQUE (intervention_id, client_id)
);

ALTER TABLE evaluations_techniciens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_evaluations_technicien_id ON evaluations_techniciens(technicien_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_client_id ON evaluations_techniciens(client_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_intervention_id ON evaluations_techniciens(intervention_id);

CREATE POLICY "Admin can view all evaluations"
  ON evaluations_techniciens FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')));

CREATE POLICY "Clients can create evaluations"
  ON evaluations_techniciens FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'client'));

CREATE POLICY "Clients can view own evaluations"
  ON evaluations_techniciens FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Technicians can view own evaluations"
  ON evaluations_techniciens FOR SELECT TO authenticated
  USING (technicien_id = auth.uid());

CREATE POLICY "Admin can delete evaluations"
  ON evaluations_techniciens FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'admin'));


-- =============================================
-- TABLE 4: urgences
-- =============================================
CREATE TABLE IF NOT EXISTS urgences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  description_probleme text NOT NULL DEFAULT '',
  niveau_urgence text NOT NULL DEFAULT 'moyen' CHECK (niveau_urgence IN ('faible', 'moyen', 'critique')),
  date_creation timestamptz DEFAULT now(),
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'assigne', 'resolu')),
  technicien_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE urgences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_urgences_client_id ON urgences(client_id);
CREATE INDEX IF NOT EXISTS idx_urgences_technicien_id ON urgences(technicien_id);
CREATE INDEX IF NOT EXISTS idx_urgences_statut ON urgences(statut);

CREATE POLICY "Admin can view all urgences"
  ON urgences FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')));

CREATE POLICY "Admin can update urgences"
  ON urgences FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')))
  WITH CHECK (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role IN ('admin', 'office')));

CREATE POLICY "Admin can delete urgences"
  ON urgences FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'admin'));

CREATE POLICY "Clients can create urgences"
  ON urgences FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() AND EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'client'));

CREATE POLICY "Clients can view own urgences"
  ON urgences FOR SELECT TO authenticated
  USING (client_id = auth.uid());

CREATE POLICY "Technicians can view assigned urgences"
  ON urgences FOR SELECT TO authenticated
  USING (technicien_id = auth.uid() AND EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'tech'));

CREATE POLICY "Technicians can update assigned urgences"
  ON urgences FOR UPDATE TO authenticated
  USING (technicien_id = auth.uid() AND EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'tech'))
  WITH CHECK (technicien_id = auth.uid() AND EXISTS (SELECT 1 FROM app_users WHERE app_users.id = auth.uid() AND app_users.role = 'tech'));


-- =============================================
-- TRIGGERS
-- =============================================
CREATE OR REPLACE FUNCTION update_urgences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_urgences_updated_at') THEN
    CREATE TRIGGER trigger_update_urgences_updated_at BEFORE UPDATE ON urgences FOR EACH ROW EXECUTE FUNCTION update_urgences_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_installations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_installations_updated_at') THEN
    CREATE TRIGGER trigger_update_installations_updated_at BEFORE UPDATE ON installations_client FOR EACH ROW EXECUTE FUNCTION update_installations_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION notify_technician_urgence_assigned()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.technicien_id IS NOT NULL AND (OLD.technicien_id IS NULL OR OLD.technicien_id != NEW.technicien_id) THEN
    INSERT INTO notifications (user_id, title, message, type, created_at)
    VALUES (NEW.technicien_id, 'Urgence assignee', 'Une urgence de niveau ' || NEW.niveau_urgence || ' vous a ete assignee.', 'urgence', now());
  END IF;
  RETURN NEW;
END; $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_notify_urgence_assigned') THEN
    CREATE TRIGGER trigger_notify_urgence_assigned AFTER UPDATE ON urgences FOR EACH ROW EXECUTE FUNCTION notify_technician_urgence_assigned();
  END IF;
END $$;


-- =============================================
-- Enable Realtime
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE installations_client;
ALTER PUBLICATION supabase_realtime ADD TABLE historique_interventions_installation;
ALTER PUBLICATION supabase_realtime ADD TABLE evaluations_techniciens;
ALTER PUBLICATION supabase_realtime ADD TABLE urgences;