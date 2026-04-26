/*
  # Part 4: Salary, Maintenance Contracts, Installations, Evaluations, Urgences

  1. New Tables
    - `tarifs_horaires` - Hourly rates
    - `heures_travail` - Work hours tracking
    - `fiches_paie` - Payslips
    - `absences` - Employee absences
    - `contrats_maintenance` - Maintenance contracts
    - `visites_contrat` - Contract visits
    - `installations_client` - Client installations
    - `historique_interventions_installation` - Installation intervention history
    - `evaluations_techniciens` - Technician evaluations
    - `urgences` - Emergency requests
    - `expenses` - Expense tracking
    - `stock_items` - Stock management
    - `stock_movements` - Stock movements
*/

-- tarifs_horaires
CREATE TABLE IF NOT EXISTS tarifs_horaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL CHECK (categorie IN ('technicien', 'employe_bureau')),
  role text NOT NULL,
  tarif_client_gnf numeric(15,2) NOT NULL DEFAULT 0,
  tarif_client_eur numeric(10,2) NOT NULL DEFAULT 0,
  salaire_horaire_gnf numeric(15,2) NOT NULL DEFAULT 0,
  date_creation timestamptz NOT NULL DEFAULT now(),
  UNIQUE (categorie, role)
);

ALTER TABLE tarifs_horaires ENABLE ROW LEVEL SECURITY;

-- heures_travail
CREATE TABLE IF NOT EXISTS heures_travail (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  intervention_id uuid REFERENCES chantiers(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  nombre_heures numeric(6,2) NOT NULL DEFAULT 0,
  tarif_horaire_gnf numeric(15,2) NOT NULL DEFAULT 0,
  total_gnf numeric(15,2) GENERATED ALWAYS AS (nombre_heures * tarif_horaire_gnf) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE heures_travail ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_heures_travail_employe_id ON heures_travail(employe_id);
CREATE INDEX IF NOT EXISTS idx_heures_travail_intervention_id ON heures_travail(intervention_id);

-- fiches_paie
CREATE TABLE IF NOT EXISTS fiches_paie (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  mois smallint NOT NULL CHECK (mois BETWEEN 1 AND 12),
  annee smallint NOT NULL CHECK (annee > 2000),
  total_heures numeric(8,2) NOT NULL DEFAULT 0,
  salaire_brut numeric(15,2) NOT NULL DEFAULT 0,
  primes numeric(15,2) NOT NULL DEFAULT 0,
  avances numeric(15,2) NOT NULL DEFAULT 0,
  salaire_net numeric(15,2) GENERATED ALWAYS AS (salaire_brut + primes - avances) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  nombre_absences numeric NOT NULL DEFAULT 0,
  motifs_absences text NOT NULL DEFAULT '',
  salaire_horaire_brut numeric NOT NULL DEFAULT 0,
  echelon text NOT NULL DEFAULT '',
  UNIQUE (employe_id, mois, annee)
);

ALTER TABLE fiches_paie ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_fiches_paie_employe_id ON fiches_paie(employe_id);

-- absences
CREATE TABLE IF NOT EXISTS absences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employe_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  nombre_jours numeric NOT NULL DEFAULT 0,
  motif text NOT NULL DEFAULT '',
  justifie boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES app_users(id)
);

ALTER TABLE absences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_absences_employe_id ON absences(employe_id);

-- contrats_maintenance
CREATE TABLE IF NOT EXISTS contrats_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES app_users(id) ON DELETE RESTRICT,
  type_contrat text NOT NULL DEFAULT 'basique' CHECK (type_contrat IN ('basique', 'standard', 'premium')),
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  prix_gnf numeric(15,0) NOT NULL DEFAULT 0,
  frequence_visite integer NOT NULL DEFAULT 1 CHECK (frequence_visite > 0 AND frequence_visite <= 52),
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'suspendu', 'expire', 'resilie')),
  description text DEFAULT '',
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contrats_maintenance ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contrats_maintenance_client_id ON contrats_maintenance(client_id);

-- visites_contrat
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

ALTER TABLE visites_contrat ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_visites_contrat_contrat_id ON visites_contrat(contrat_id);
CREATE INDEX IF NOT EXISTS idx_visites_contrat_technicien_id ON visites_contrat(technicien_id);

-- installations_client
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

CREATE INDEX IF NOT EXISTS idx_installations_client_id ON installations_client(client_id);

-- historique_interventions_installation
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

-- evaluations_techniciens
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

-- urgences
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

-- expenses
CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES chantiers(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('transport', 'materiel', 'repas', 'hebergement', 'autre')),
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  description text NOT NULL,
  receipt_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by uuid REFERENCES app_users(id),
  approved_at timestamptz,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_expenses_technician_id ON expenses(technician_id);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON expenses(project_id);

-- stock_items
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('materiel', 'outillage', 'consommable', 'securite', 'autre')),
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  min_quantity integer NOT NULL DEFAULT 0 CHECK (min_quantity >= 0),
  unit text NOT NULL DEFAULT 'piece' CHECK (unit IN ('piece', 'kg', 'litre', 'metre', 'carton', 'paquet')),
  unit_price numeric NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  supplier text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stock_items_name_unique ON stock_items(LOWER(name));

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;

-- stock_movements
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_item_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('in', 'out')),
  quantity integer NOT NULL CHECK (quantity > 0),
  reference text,
  notes text,
  created_by uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_stock_movements_item_id ON stock_movements(stock_item_id);
