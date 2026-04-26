/*
  # Part 1: Core Tables - app_users, profiles, clients, services, technicians

  1. New Tables
    - `app_users` - Central user table (admin, tech, office, client roles)
    - `profiles` - Auth-linked profiles
    - `clients` - Client records
    - `services` - Service catalog
    - `service_items` - Line items for services
    - `technicians` - Technician profiles linked to app_users
    - `technician_gps_tracking` - GPS tracking for technicians

  2. Security
    - RLS enabled on all tables
    - Helper functions for role checks
*/

-- Helper function: is_admin_user (no args)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = (select auth.uid())
    AND role = 'admin'
  );
$$;

-- Helper function: is_admin_or_office (no args)
CREATE OR REPLACE FUNCTION is_admin_or_office()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'office') FROM app_users WHERE id = (select auth.uid())),
    false
  );
$$;

-- Helper function: is_admin_user(uuid)
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users
    WHERE id = user_id
    AND role = 'admin'
  );
$$;

-- Helper function: is_admin_or_office_user(uuid)
CREATE OR REPLACE FUNCTION is_admin_or_office_user(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role IN ('admin', 'office') FROM app_users WHERE id = user_id),
    false
  );
$$;

-- Helper function: get_user_role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM app_users WHERE id = (select auth.uid())),
    'anonymous'
  );
$$;

-- app_users
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  phone text,
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'tech', 'office', 'admin')),
  birth_date date,
  contract_date date DEFAULT CURRENT_DATE,
  profile_photo text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  contract_number text,
  echelon text,
  status text,
  created_date text,
  mad text,
  creation_location text,
  district text,
  postal_code text,
  date_of_birth date,
  contract_signature_date date,
  religion text,
  marital_status text CHECK (marital_status IS NULL OR marital_status IN ('Celibataire', 'Marie(e)', 'Divorce(e)', 'Veuf(ve)')),
  office_position text,
  city text,
  company_founder text,
  company_creation_date text,
  company_country text,
  company_address text,
  company_postal_code text
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_birth_date ON app_users(birth_date);
CREATE INDEX IF NOT EXISTS idx_app_users_contract_date ON app_users(contract_date);

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  address text,
  city text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  base_price numeric DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- service_items
CREATE TABLE IF NOT EXISTS service_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE service_items ENABLE ROW LEVEL SECURITY;

-- technicians
CREATE TABLE IF NOT EXISTS technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES app_users(id) ON DELETE CASCADE UNIQUE,
  role_level text,
  status text,
  satisfaction_rate integer,
  total_revenue numeric,
  color text,
  completed_jobs integer DEFAULT 0,
  battery_level integer,
  contract_date date,
  daily_km numeric,
  created_at timestamptz DEFAULT now(),
  home_address text,
  home_lat numeric,
  home_lng numeric,
  absence_count integer DEFAULT 0,
  sick_leave_count integer DEFAULT 0,
  complaint_count integer DEFAULT 0
);

ALTER TABLE technicians ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_technicians_profile_id ON technicians(profile_id);

-- technician_gps_tracking
CREATE TABLE IF NOT EXISTS technician_gps_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  latitude numeric,
  longitude numeric,
  battery_level integer,
  is_active boolean DEFAULT true,
  tracked_at timestamptz DEFAULT now()
);

ALTER TABLE technician_gps_tracking ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_gps_tracking_user_id ON technician_gps_tracking(user_id);

-- technician_stats view
CREATE OR REPLACE VIEW technician_stats AS
SELECT 
  t.id, t.profile_id, t.role_level, t.status, t.completed_jobs,
  t.absence_count, t.sick_leave_count, t.complaint_count,
  t.home_address, t.home_lat, t.home_lng, t.contract_date,
  EXTRACT(YEAR FROM age(CURRENT_DATE, t.contract_date))::integer as years_of_service,
  EXTRACT(MONTH FROM age(CURRENT_DATE, t.contract_date))::integer as months_of_service
FROM technicians t;
