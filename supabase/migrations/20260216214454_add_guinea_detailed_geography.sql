/*
  # Carte géographique détaillée de la Guinée
  
  1. Nouvelles Tables
    - `guinea_regions` - Régions administratives de Guinée (8 régions)
    - `guinea_prefectures` - Préfectures (33 préfectures)
    - `guinea_communes` - Communes urbaines et rurales
    - `guinea_districts` - Districts et quartiers
    - `guinea_villages` - Villages et localités
  
  2. Structure
    - Hiérarchie: Région > Préfecture > Commune > District > Village
    - Coordonnées GPS pour chaque niveau
    - Population et informations démographiques
    
  3. Sécurité
    - RLS activé sur toutes les tables
    - Lecture publique pour tous les utilisateurs authentifiés
*/

-- Table des Régions de Guinée
CREATE TABLE IF NOT EXISTS guinea_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_fr text NOT NULL,
  capital text NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  population bigint DEFAULT 0,
  area_km2 decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table des Préfectures
CREATE TABLE IF NOT EXISTS guinea_prefectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES guinea_regions(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_fr text NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  population bigint DEFAULT 0,
  area_km2 decimal(10, 2) DEFAULT 0,
  is_capital boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Table des Communes
CREATE TABLE IF NOT EXISTS guinea_communes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture_id uuid REFERENCES guinea_prefectures(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text CHECK (type IN ('urbaine', 'rurale')) NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  population bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table des Districts/Quartiers
CREATE TABLE IF NOT EXISTS guinea_districts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commune_id uuid REFERENCES guinea_communes(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  type text CHECK (type IN ('quartier', 'district', 'secteur')) NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  population bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Table des Villages
CREATE TABLE IF NOT EXISTS guinea_villages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id uuid REFERENCES guinea_districts(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  population integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE guinea_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guinea_prefectures ENABLE ROW LEVEL SECURITY;
ALTER TABLE guinea_communes ENABLE ROW LEVEL SECURITY;
ALTER TABLE guinea_districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guinea_villages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (lecture publique)
CREATE POLICY "Tout le monde peut voir les régions"
  ON guinea_regions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tout le monde peut voir les préfectures"
  ON guinea_prefectures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tout le monde peut voir les communes"
  ON guinea_communes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tout le monde peut voir les districts"
  ON guinea_districts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tout le monde peut voir les villages"
  ON guinea_villages FOR SELECT
  TO authenticated
  USING (true);

-- Insertion des 8 Régions de Guinée
INSERT INTO guinea_regions (code, name, name_fr, capital, latitude, longitude, population, area_km2) VALUES
('BOK', 'Boké', 'Boké', 'Boké', 10.9424, -14.2915, 1092161, 31186),
('CON', 'Conakry', 'Conakry', 'Conakry', 9.5092, -13.7122, 1660973, 450),
('FAR', 'Faranah', 'Faranah', 'Faranah', 10.0356, -10.7419, 942733, 35581),
('KAN', 'Kankan', 'Kankan', 'Kankan', 10.3853, -9.3064, 1986329, 72156),
('KIN', 'Kindia', 'Kindia', 'Kindia', 10.0569, -12.8644, 1559185, 28873),
('LAB', 'Labé', 'Labé', 'Labé', 11.3178, -12.2897, 995717, 22869),
('MAM', 'Mamou', 'Mamou', 'Mamou', 10.3759, -12.0914, 732117, 17074),
('NZE', 'Nzérékoré', 'Nzérékoré', 'Nzérékoré', 7.7562, -8.8179, 1663582, 37658);

-- Insertion des 33 Préfectures (avec leurs capitales)
DO $$
DECLARE
  region_bok uuid;
  region_con uuid;
  region_far uuid;
  region_kan uuid;
  region_kin uuid;
  region_lab uuid;
  region_mam uuid;
  region_nze uuid;
BEGIN
  SELECT id INTO region_bok FROM guinea_regions WHERE code = 'BOK';
  SELECT id INTO region_con FROM guinea_regions WHERE code = 'CON';
  SELECT id INTO region_far FROM guinea_regions WHERE code = 'FAR';
  SELECT id INTO region_kan FROM guinea_regions WHERE code = 'KAN';
  SELECT id INTO region_kin FROM guinea_regions WHERE code = 'KIN';
  SELECT id INTO region_lab FROM guinea_regions WHERE code = 'LAB';
  SELECT id INTO region_mam FROM guinea_regions WHERE code = 'MAM';
  SELECT id INTO region_nze FROM guinea_regions WHERE code = 'NZE';

  -- Région de Boké
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_bok, 'BOKE', 'Boké', 'Boké', 10.9424, -14.2915, 449405, 11053, true),
  (region_bok, 'BOFF', 'Boffa', 'Boffa', 10.1806, -14.0396, 212583, 5050, false),
  (region_bok, 'FRIA', 'Fria', 'Fria', 10.3664, -13.5844, 102370, 2016, false),
  (region_bok, 'GAOUAL', 'Gaoual', 'Gaoual', 11.7519, -13.2018, 194245, 7758, false),
  (region_bok, 'KOUNDARA', 'Koundara', 'Koundara', 12.4889, -13.3067, 133558, 5238, false);

  -- Région de Conakry
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_con, 'CONAKRY', 'Conakry', 'Conakry', 9.5092, -13.7122, 1660973, 450, true);

  -- Région de Faranah
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_far, 'FARANAH', 'Faranah', 'Faranah', 10.0356, -10.7419, 280511, 12966, true),
  (region_far, 'DABOLA', 'Dabola', 'Dabola', 10.7497, -11.1081, 182951, 6350, false),
  (region_far, 'DINGUIRAYE', 'Dinguiraye', 'Dinguiraye', 11.3000, -10.7167, 195085, 7965, false),
  (region_far, 'KISSIDOUGOU', 'Kissidougou', 'Kissidougou', 9.1847, -10.1241, 284186, 8300, false);

  -- Région de Kankan
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_kan, 'KANKAN', 'Kankan', 'Kankan', 10.3853, -9.3064, 473269, 11564, true),
  (region_kan, 'KEROUANE', 'Kérouané', 'Kérouané', 9.2667, -9.0167, 207547, 7020, false),
  (region_kan, 'KOUROUSSA', 'Kouroussa', 'Kouroussa', 10.6500, -9.8833, 268630, 16070, false),
  (region_kan, 'MANDIANA', 'Mandiana', 'Mandiana', 10.6169, -8.7000, 335329, 12825, false),
  (region_kan, 'SIGUIRI', 'Siguiri', 'Siguiri', 11.4197, -9.1700, 701554, 24677, false);

  -- Région de Kindia
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_kin, 'KINDIA', 'Kindia', 'Kindia', 10.0569, -12.8644, 438315, 9115, true),
  (region_kin, 'COYAH', 'Coyah', 'Coyah', 9.7000, -13.0500, 263850, 1169, false),
  (region_kin, 'DUBREKA', 'Dubréka', 'Dubréka', 9.7922, -13.5169, 330548, 4350, false),
  (region_kin, 'FORECARIAH', 'Forécariah', 'Forécariah', 9.4331, -13.0858, 242942, 4384, false),
  (region_kin, 'TELIMELE', 'Télimélé', 'Télimélé', 10.9064, -13.0306, 283530, 9855, false);

  -- Région de Labé
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_lab, 'LABE', 'Labé', 'Labé', 11.3178, -12.2897, 204093, 3014, true),
  (region_lab, 'KOUBIA', 'Koubia', 'Koubia', 11.5833, -11.8833, 114492, 3060, false),
  (region_lab, 'LELOUMA', 'Lélouma', 'Lélouma', 11.3167, -12.9167, 163000, 2140, false),
  (region_lab, 'MALI', 'Mali', 'Mali', 11.9778, -12.0889, 246944, 9790, false),
  (region_lab, 'TOUGUE', 'Tougué', 'Tougué', 11.4464, -11.6683, 132450, 4805, false);

  -- Région de Mamou
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_mam, 'MAMOU', 'Mamou', 'Mamou', 10.3759, -12.0914, 318283, 8000, true),
  (region_mam, 'DALABA', 'Dalaba', 'Dalaba', 10.6833, -12.2500, 136711, 3700, false),
  (region_mam, 'PITA', 'Pita', 'Pita', 11.0594, -12.3950, 277123, 5374, false);

  -- Région de Nzérékoré
  INSERT INTO guinea_prefectures (region_id, code, name, name_fr, latitude, longitude, population, area_km2, is_capital) VALUES
  (region_nze, 'NZEREKORE', 'Nzérékoré', 'Nzérékoré', 7.7562, -8.8179, 396117, 4625, true),
  (region_nze, 'BEYLA', 'Beyla', 'Beyla', 8.6856, -8.6528, 326082, 17452, false),
  (region_nze, 'GUECKEDOU', 'Guéckédou', 'Guéckédou', 8.5667, -10.1333, 290611, 4400, false),
  (region_nze, 'LOLA', 'Lola', 'Lola', 7.7833, -8.5333, 175716, 4688, false),
  (region_nze, 'MACENTA', 'Macenta', 'Macenta', 8.5461, -9.4708, 278456, 4704, false),
  (region_nze, 'YOMOU', 'Yomou', 'Yomou', 7.5667, -9.2500, 114860, 3790, false);

END $$;

-- Insertion des Communes principales de Conakry (5 communes)
DO $$
DECLARE
  pref_conakry uuid;
BEGIN
  SELECT id INTO pref_conakry FROM guinea_prefectures WHERE code = 'CONAKRY';

  INSERT INTO guinea_communes (prefecture_id, code, name, type, latitude, longitude, population) VALUES
  (pref_conakry, 'KALOUM', 'Kaloum', 'urbaine', 9.5370, -13.6785, 105000),
  (pref_conakry, 'DIXINN', 'Dixinn', 'urbaine', 9.5511, -13.7021, 200000),
  (pref_conakry, 'MATAM', 'Matam', 'urbaine', 9.5300, -13.6700, 350000),
  (pref_conakry, 'RATOMA', 'Ratoma', 'urbaine', 9.5762, -13.6510, 650000),
  (pref_conakry, 'MATOTO', 'Matoto', 'urbaine', 9.5200, -13.6200, 355973);
END $$;

-- Insertion des Quartiers principaux de Conakry
DO $$
DECLARE
  comm_kaloum uuid;
  comm_dixinn uuid;
  comm_matam uuid;
  comm_ratoma uuid;
  comm_matoto uuid;
BEGIN
  SELECT id INTO comm_kaloum FROM guinea_communes WHERE code = 'KALOUM';
  SELECT id INTO comm_dixinn FROM guinea_communes WHERE code = 'DIXINN';
  SELECT id INTO comm_matam FROM guinea_communes WHERE code = 'MATAM';
  SELECT id INTO comm_ratoma FROM guinea_communes WHERE code = 'RATOMA';
  SELECT id INTO comm_matoto FROM guinea_communes WHERE code = 'MATOTO';

  -- Quartiers de Kaloum (Centre administratif)
  INSERT INTO guinea_districts (commune_id, code, name, type, latitude, longitude, population) VALUES
  (comm_kaloum, 'KAL-CENT', 'Centre-Ville', 'quartier', 9.5092, -13.7122, 15000),
  (comm_kaloum, 'KAL-PORT', 'Port de Conakry', 'quartier', 9.5150, -13.7200, 8000),
  (comm_kaloum, 'KAL-BOUL', 'Boulbinet', 'quartier', 9.5180, -13.7080, 12000),
  (comm_kaloum, 'KAL-ALMAN', 'Almamya', 'quartier', 9.5100, -13.7100, 10000),
  (comm_kaloum, 'KAL-SAND', 'Sandervalia', 'quartier', 9.5250, -13.7050, 12000),
  (comm_kaloum, 'KAL-TOMBO', 'Tombo', 'quartier', 9.5000, -13.7300, 15000),
  (comm_kaloum, 'KAL-COLEAR', 'Coléah', 'quartier', 9.5200, -13.7000, 18000),
  (comm_kaloum, 'KAL-CORONA', 'Coronthie', 'quartier', 9.5150, -13.7150, 15000);

  -- Quartiers de Dixinn
  INSERT INTO guinea_districts (commune_id, code, name, type, latitude, longitude, population) VALUES
  (comm_dixinn, 'DIX-CENT', 'Dixinn Centre', 'quartier', 9.5511, -13.7021, 25000),
  (comm_dixinn, 'DIX-PORT', 'Dixinn Port', 'quartier', 9.5450, -13.7100, 18000),
  (comm_dixinn, 'DIX-GARE', 'Dixinn Gare', 'quartier', 9.5550, -13.7000, 20000),
  (comm_dixinn, 'DIX-KAMI', 'Camayenne', 'quartier', 9.5600, -13.6950, 35000),
  (comm_dixinn, 'DIX-TEMI', 'Teminetaye', 'quartier', 9.5650, -13.6900, 28000),
  (comm_dixinn, 'DIX-LAND', 'Landreah', 'quartier', 9.5500, -13.7050, 22000),
  (comm_dixinn, 'DIX-BOUS', 'Boussoura', 'quartier', 9.5580, -13.6850, 30000),
  (comm_dixinn, 'DIX-MIN', 'Minière', 'quartier', 9.5530, -13.6950, 22000);

  -- Quartiers de Matam
  INSERT INTO guinea_districts (commune_id, code, name, type, latitude, longitude, population) VALUES
  (comm_matam, 'MAT-CENT', 'Matam Centre', 'quartier', 9.5300, -13.6700, 40000),
  (comm_matam, 'MAT-MAFAN', 'Mafanco', 'quartier', 9.5250, -13.6750, 35000),
  (comm_matam, 'MAT-MEDINA', 'Medina', 'quartier', 9.5350, -13.6650, 45000),
  (comm_matam, 'MAT-BELLA', 'Bellaire', 'quartier', 9.5400, -13.6600, 38000),
  (comm_matam, 'MAT-HAMO', 'Hamdallaye', 'quartier', 9.5450, -13.6550, 50000),
  (comm_matam, 'MAT-TANG', 'Taouyah', 'quartier', 9.5320, -13.6720, 42000),
  (comm_matam, 'MAT-BONS', 'Bonsoguera', 'quartier', 9.5280, -13.6780, 35000),
  (comm_matam, 'MAT-MISS', 'Missira', 'quartier', 9.5380, -13.6620, 45000),
  (comm_matam, 'MAT-COSA', 'Cosa', 'quartier', 9.5330, -13.6680, 20000);

  -- Quartiers de Ratoma
  INSERT INTO guinea_districts (commune_id, code, name, type, latitude, longitude, population) VALUES
  (comm_ratoma, 'RAT-CENT', 'Ratoma Centre', 'quartier', 9.5762, -13.6510, 50000),
  (comm_ratoma, 'RAT-KOLOMA', 'Koloma', 'quartier', 9.5800, -13.6450, 55000),
  (comm_ratoma, 'RAT-SIMBAYA', 'Simbaya', 'quartier', 9.5850, -13.6400, 60000),
  (comm_ratoma, 'RAT-KAPORO', 'Kaporo Rails', 'quartier', 9.5900, -13.6350, 65000),
  (comm_ratoma, 'RAT-ENTAG', 'Entagné', 'quartier', 9.5950, -13.6300, 55000),
  (comm_ratoma, 'RAT-WOYO', 'Woyoyah', 'quartier', 9.6000, -13.6250, 70000),
  (comm_ratoma, 'RAT-KOBAYA', 'Kobaya', 'quartier', 9.5820, -13.6480, 48000),
  (comm_ratoma, 'RAT-KAGBE', 'Kagbelen', 'quartier', 9.5780, -13.6530, 45000),
  (comm_ratoma, 'RAT-YIMB', 'Yimbaya', 'quartier', 9.5920, -13.6370, 52000),
  (comm_ratoma, 'RAT-COSA', 'Cosa', 'quartier', 9.5750, -13.6550, 50000),
  (comm_ratoma, 'RAT-HERM', 'Hermakonou', 'quartier', 9.5880, -13.6420, 50000);

  -- Quartiers de Matoto
  INSERT INTO guinea_districts (commune_id, code, name, type, latitude, longitude, population) VALUES
  (comm_matoto, 'MAT-SANG', 'Sangoyah', 'quartier', 9.5200, -13.6200, 45000),
  (comm_matoto, 'MAT-SONFON', 'Sonfonia', 'quartier', 9.5150, -13.6100, 50000),
  (comm_matoto, 'MAT-HAMD', 'Hamdallaye', 'quartier', 9.5100, -13.6050, 55000),
  (comm_matoto, 'MAT-YENN', 'Yenguema', 'quartier', 9.5050, -13.6000, 40000),
  (comm_matoto, 'MAT-GBES', 'Gbessia', 'quartier', 9.5000, -13.5950, 45000),
  (comm_matoto, 'MAT-AERO', 'Aéroport', 'quartier', 9.5250, -13.6150, 35000),
  (comm_matoto, 'MAT-DABOM', 'Dabompa', 'quartier', 9.5180, -13.6120, 38000),
  (comm_matoto, 'MAT-ONDE', 'Onde', 'quartier', 9.5220, -13.6180, 47973);

END $$;

-- Insertion de communes pour autres grandes villes
DO $$
DECLARE
  pref_kankan uuid;
  pref_labe uuid;
  pref_nzerekore uuid;
  pref_kindia uuid;
  pref_boke uuid;
BEGIN
  SELECT id INTO pref_kankan FROM guinea_prefectures WHERE code = 'KANKAN';
  SELECT id INTO pref_labe FROM guinea_prefectures WHERE code = 'LABE';
  SELECT id INTO pref_nzerekore FROM guinea_prefectures WHERE code = 'NZEREKORE';
  SELECT id INTO pref_kindia FROM guinea_prefectures WHERE code = 'KINDIA';
  SELECT id INTO pref_boke FROM guinea_prefectures WHERE code = 'BOKE';

  -- Communes de Kankan
  INSERT INTO guinea_communes (prefecture_id, code, name, type, latitude, longitude, population) VALUES
  (pref_kankan, 'KAN-URB', 'Kankan Urbaine', 'urbaine', 10.3853, -9.3064, 200000),
  (pref_kankan, 'KAN-RUR1', 'Baté-Nafadji', 'rurale', 10.4200, -9.2500, 35000),
  (pref_kankan, 'KAN-RUR2', 'Gberedou/Baranama', 'rurale', 10.3500, -9.4000, 42000);

  -- Communes de Labé
  INSERT INTO guinea_communes (prefecture_id, code, name, type, latitude, longitude, population) VALUES
  (pref_labe, 'LAB-URB', 'Labé Urbaine', 'urbaine', 11.3178, -12.2897, 150000),
  (pref_labe, 'LAB-RUR1', 'Dalein', 'rurale', 11.2800, -12.3200, 28000),
  (pref_labe, 'LAB-RUR2', 'Tountouroun', 'rurale', 11.3500, -12.2500, 26093);

  -- Communes de Nzérékoré
  INSERT INTO guinea_communes (prefecture_id, code, name, type, latitude, longitude, population) VALUES
  (pref_nzerekore, 'NZE-URB', 'Nzérékoré Urbaine', 'urbaine', 7.7562, -8.8179, 180000),
  (pref_nzerekore, 'NZE-RUR1', 'Koropara', 'rurale', 7.8000, -8.7500, 45000),
  (pref_nzerekore, 'NZE-RUR2', 'Soulouta', 'rurale', 7.7200, -8.8500, 35000);

  -- Communes de Kindia
  INSERT INTO guinea_communes (prefecture_id, code, name, type, latitude, longitude, population) VALUES
  (pref_kindia, 'KIN-URB', 'Kindia Urbaine', 'urbaine', 10.0569, -12.8644, 180000),
  (pref_kindia, 'KIN-RUR1', 'Bangouyah', 'rurale', 10.1000, -12.8000, 55000),
  (pref_kindia, 'KIN-RUR2', 'Damakania', 'rurale', 10.0200, -12.9000, 48000);

  -- Communes de Boké
  INSERT INTO guinea_communes (prefecture_id, code, name, type, latitude, longitude, population) VALUES
  (pref_boke, 'BOK-URB', 'Boké Urbaine', 'urbaine', 10.9424, -14.2915, 120000),
  (pref_boke, 'BOK-RUR1', 'Dabiss', 'rurale', 10.9800, -14.2500, 48000),
  (pref_boke, 'BOK-RUR2', 'Kolaboui', 'rurale', 10.9000, -14.3300, 52000);

END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_prefectures_region ON guinea_prefectures(region_id);
CREATE INDEX IF NOT EXISTS idx_communes_prefecture ON guinea_communes(prefecture_id);
CREATE INDEX IF NOT EXISTS idx_districts_commune ON guinea_districts(commune_id);
CREATE INDEX IF NOT EXISTS idx_villages_district ON guinea_villages(district_id);

-- Index géospatiaux pour recherches par coordonnées
CREATE INDEX IF NOT EXISTS idx_regions_coords ON guinea_regions(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_prefectures_coords ON guinea_prefectures(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_communes_coords ON guinea_communes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_districts_coords ON guinea_districts(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_villages_coords ON guinea_villages(latitude, longitude);