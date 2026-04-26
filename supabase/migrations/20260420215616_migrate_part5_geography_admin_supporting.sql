/*
  # Part 5: Geography tables, Admin tables, Supporting tables

  1. New Tables
    - Guinea geography: regions, prefectures, communes, districts, villages, cities
    - Admin: admin_settings, admin_alerts, admin_broadcasts
    - Supporting: notifications, chatbot_conversations, incidents, birthdays, etc.
*/

-- guinea_regions
CREATE TABLE IF NOT EXISTS guinea_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_fr text NOT NULL,
  capital text NOT NULL,
  latitude decimal(10,7) NOT NULL,
  longitude decimal(10,7) NOT NULL,
  population bigint DEFAULT 0,
  area_km2 decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guinea_regions ENABLE ROW LEVEL SECURITY;

-- guinea_prefectures
CREATE TABLE IF NOT EXISTS guinea_prefectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES guinea_regions(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_fr text NOT NULL,
  latitude decimal(10,7) NOT NULL,
  longitude decimal(10,7) NOT NULL,
  population bigint DEFAULT 0,
  area_km2 decimal(10,2) DEFAULT 0,
  is_capital boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guinea_prefectures ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_guinea_prefectures_region_id ON guinea_prefectures(region_id);

-- guinea_communes
CREATE TABLE IF NOT EXISTS guinea_communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture_id uuid REFERENCES guinea_prefectures(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_fr text NOT NULL,
  latitude decimal(10,7),
  longitude decimal(10,7),
  population bigint DEFAULT 0,
  type text DEFAULT 'rural',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guinea_communes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_guinea_communes_prefecture_id ON guinea_communes(prefecture_id);

-- guinea_districts
CREATE TABLE IF NOT EXISTS guinea_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id uuid REFERENCES guinea_communes(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_fr text NOT NULL,
  latitude decimal(10,7),
  longitude decimal(10,7),
  population bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guinea_districts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_guinea_districts_commune_id ON guinea_districts(commune_id);

-- guinea_villages
CREATE TABLE IF NOT EXISTS guinea_villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid REFERENCES guinea_districts(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  name_fr text NOT NULL,
  latitude decimal(10,7),
  longitude decimal(10,7),
  population bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guinea_villages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_guinea_villages_district_id ON guinea_villages(district_id);

-- guinea_cities
CREATE TABLE IF NOT EXISTS guinea_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_fr text NOT NULL,
  region text NOT NULL,
  prefecture text,
  population bigint DEFAULT 0,
  latitude decimal(10,7) NOT NULL,
  longitude decimal(10,7) NOT NULL,
  is_capital boolean DEFAULT false,
  is_regional_capital boolean DEFAULT false,
  is_prefecture_capital boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guinea_cities ENABLE ROW LEVEL SECURITY;

-- admin_settings
CREATE TABLE IF NOT EXISTS admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text UNIQUE NOT NULL,
  setting_value text,
  setting_type text DEFAULT 'string',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES app_users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- admin_alerts
CREATE TABLE IF NOT EXISTS admin_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  message text,
  severity text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

-- admin_broadcasts
CREATE TABLE IF NOT EXISTS admin_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'announcement',
  target_roles text[] NOT NULL DEFAULT '{client,tech,office,visitor}',
  is_active boolean NOT NULL DEFAULT true,
  priority text NOT NULL DEFAULT 'medium',
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  image_url text
);
ALTER TABLE admin_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_broadcasts REPLICA IDENTITY FULL;

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  type text,
  title text,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  sms_enabled boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- chatbot_conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  user_message text NOT NULL,
  bot_response text NOT NULL,
  language text DEFAULT 'fr',
  category text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- incidents
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  incident_type text,
  severity text,
  title text NOT NULL,
  description text,
  location text,
  incident_date date DEFAULT CURRENT_DATE,
  images jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- birthdays
CREATE TABLE IF NOT EXISTS birthdays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  person_name text NOT NULL,
  birthday_date date NOT NULL,
  relationship text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE birthdays ENABLE ROW LEVEL SECURITY;

-- daily_notes
CREATE TABLE IF NOT EXISTS daily_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  note_date date DEFAULT CURRENT_DATE,
  content text,
  is_shared boolean DEFAULT false,
  shared_with text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE daily_notes ENABLE ROW LEVEL SECURITY;

-- legal_terms_acceptance
CREATE TABLE IF NOT EXISTS legal_terms_acceptance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  accepted boolean DEFAULT false,
  signature_data text,
  accepted_at timestamptz,
  terms_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE legal_terms_acceptance ENABLE ROW LEVEL SECURITY;

-- legal_signatures
CREATE TABLE IF NOT EXISTS legal_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  document_type text,
  signature_data text,
  signed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE legal_signatures ENABLE ROW LEVEL SECURITY;

-- non_compete_signatures
CREATE TABLE IF NOT EXISTS non_compete_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  signed boolean DEFAULT false,
  signed_at timestamptz,
  terms_version text DEFAULT '1.0',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE non_compete_signatures ENABLE ROW LEVEL SECURITY;

-- contact_messages
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- payment_records
CREATE TABLE IF NOT EXISTS payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  payment_date date DEFAULT CURRENT_DATE,
  amount numeric DEFAULT 0,
  payment_type text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

-- site_images
CREATE TABLE IF NOT EXISTS site_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text,
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  image_type text,
  uploaded_at timestamptz DEFAULT now()
);
ALTER TABLE site_images ENABLE ROW LEVEL SECURITY;

-- site_notes
CREATE TABLE IF NOT EXISTS site_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id text,
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  note_content text,
  progress_percentage integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE site_notes ENABLE ROW LEVEL SECURITY;

-- reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id),
  title text NOT NULL,
  content text,
  report_type text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- reviews
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES app_users(id),
  technician_id uuid REFERENCES app_users(id),
  chantier_id uuid REFERENCES chantiers(id),
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- stocks (legacy)
CREATE TABLE IF NOT EXISTS stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  quantity integer DEFAULT 0,
  category text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;

-- mission_trips
CREATE TABLE IF NOT EXISTS mission_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  destination text,
  start_date date,
  end_date date,
  purpose text,
  status text DEFAULT 'planned',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE mission_trips ENABLE ROW LEVEL SECURITY;

-- worksite_completions
CREATE TABLE IF NOT EXISTS worksite_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chantier_id uuid REFERENCES chantiers(id) ON DELETE CASCADE,
  completed_by uuid REFERENCES app_users(id),
  completion_date date DEFAULT CURRENT_DATE,
  notes text,
  photos text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE worksite_completions ENABLE ROW LEVEL SECURITY;

-- trigger_error_log
CREATE TABLE IF NOT EXISTS trigger_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name text,
  error_message text,
  error_detail text,
  user_id uuid,
  user_email text,
  raw_metadata jsonb,
  created_at timestamptz DEFAULT now()
);
