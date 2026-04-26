/*
  # Part 2: Quotes, Invoices, Planning, Chantiers

  1. New Tables
    - `chantiers` - Job sites / projects (single source of truth)
    - `quote_requests` - Quote/devis requests
    - `quotes` - Legacy quotes table
    - `invoices` - Invoices with payment tranches
    - `planning` - Scheduling entries
    - `planning_technicians` - Many-to-many planning <-> technicians
    - `chantier_activities` - Activity log for job sites
    - `appointments` - Client appointments
    - `project_photos` - Photos for projects
    - `projects` - Legacy projects table
*/

-- chantiers (must be created before quote_requests due to FK)
CREATE TABLE IF NOT EXISTS chantiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  client_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  technician_id uuid,
  service_id uuid,
  location text,
  status text DEFAULT 'planned',
  progress integer DEFAULT 0,
  scheduled_date date,
  scheduled_time text,
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  is_validated boolean DEFAULT false,
  validated_by uuid REFERENCES app_users(id),
  validated_at timestamptz,
  is_public boolean DEFAULT false,
  client_name text,
  description text DEFAULT '',
  rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  location_lat numeric,
  location_lng numeric,
  started_at timestamptz,
  interrupted_at timestamptz,
  interruption_reason text
);

ALTER TABLE chantiers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_chantiers_client_id ON chantiers(client_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_technician_id ON chantiers(technician_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_status ON chantiers(status);
CREATE INDEX IF NOT EXISTS idx_chantiers_scheduled_date ON chantiers(scheduled_date);

-- quote_requests
CREATE TABLE IF NOT EXISTS quote_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  service_type text,
  description text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  image_urls text[],
  tracking_number text UNIQUE,
  client_email_for_tracking text,
  response_notes text,
  estimated_price decimal(10,2),
  estimated_duration text,
  assigned_to uuid REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  validity_date timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejected_reason text,
  last_reminded_at timestamptz,
  reminder_count integer DEFAULT 0,
  archived_at timestamptz,
  user_id uuid REFERENCES auth.users(id),
  location_coordinates jsonb,
  chantier_id uuid REFERENCES chantiers(id)
);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_user_id ON quote_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_tracking ON quote_requests(tracking_number);

-- Add quote_request_id FK to chantiers
ALTER TABLE chantiers ADD COLUMN IF NOT EXISTS quote_request_id uuid REFERENCES quote_requests(id);

-- quotes (legacy)
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text,
  service_name text,
  amount numeric DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'En attente' CHECK (status IN ('En attente', 'Payee', 'En retard')),
  due_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  project_id uuid REFERENCES chantiers(id),
  invoice_number text UNIQUE,
  payment_date date,
  payment_method text,
  notes text,
  client_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  items jsonb DEFAULT '[]'::jsonb,
  quote_request_id uuid REFERENCES quote_requests(id) ON DELETE SET NULL,
  tranche_signature_percent numeric DEFAULT 65,
  tranche_signature_amount numeric DEFAULT 0,
  tranche_signature_paid boolean DEFAULT false,
  tranche_signature_date timestamptz,
  tranche_moitier_percent numeric DEFAULT 20,
  tranche_moitier_amount numeric DEFAULT 0,
  tranche_moitier_paid boolean DEFAULT false,
  tranche_moitier_date timestamptz,
  tranche_fin_percent numeric DEFAULT 15,
  tranche_fin_amount numeric DEFAULT 0,
  tranche_fin_paid boolean DEFAULT false,
  tranche_fin_date timestamptz,
  email_sent boolean DEFAULT false,
  email_sent_at timestamptz,
  email_recipient text,
  payment_proof_url text
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- planning
CREATE TABLE IF NOT EXISTS planning (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid REFERENCES chantiers(id) ON DELETE CASCADE,
  technician_id uuid REFERENCES technicians(id),
  scheduled_date date,
  start_time text,
  end_time text,
  created_at timestamptz DEFAULT now(),
  end_date date
);

ALTER TABLE planning ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_planning_chantier_id ON planning(chantier_id);
CREATE INDEX IF NOT EXISTS idx_planning_technician_id ON planning(technician_id);

-- planning_technicians
CREATE TABLE IF NOT EXISTS planning_technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  planning_id uuid REFERENCES planning(id) ON DELETE CASCADE NOT NULL,
  technician_id uuid REFERENCES technicians(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(planning_id, technician_id)
);

ALTER TABLE planning_technicians ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_planning_technicians_planning_id ON planning_technicians(planning_id);
CREATE INDEX IF NOT EXISTS idx_planning_technicians_technician_id ON planning_technicians(technician_id);

-- chantier_activities
CREATE TABLE IF NOT EXISTS chantier_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid NOT NULL REFERENCES chantiers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  activity_type text NOT NULL CHECK (activity_type IN (
    'started', 'interrupted', 'abandoned', 'team_changed', 'completed',
    'photo_added', 'note_added', 'progress_updated', 'resumed'
  )),
  description text NOT NULL DEFAULT '',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chantier_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE chantier_activities REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_chantier_activities_chantier_id ON chantier_activities(chantier_id);

-- appointments
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quote_requests(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_date date NOT NULL,
  scheduled_time text NOT NULL,
  service_type text NOT NULL,
  address text,
  location_coordinates jsonb,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  assigned_to uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  completed_at timestamptz
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON appointments(user_id);

-- project_photos
CREATE TABLE IF NOT EXISTS project_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES chantiers(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  uploaded_by uuid REFERENCES app_users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE project_photos ENABLE ROW LEVEL SECURITY;

-- projects (legacy/deprecated)
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  client_id uuid,
  technician_id uuid,
  status text DEFAULT 'pending',
  start_date date,
  end_date date,
  budget numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
