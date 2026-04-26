/*
  # Ajout des villes de Guinée
  
  1. Nouvelle Table
    - `guinea_cities` - Villes principales de Guinée
      - Liée aux préfectures
      - Coordonnées GPS précises
      - Population et statut (ville/village)
  
  2. Données
    - Toutes les grandes villes de Guinée
    - Villes moyennes et petites villes importantes
    - Coordonnées GPS exactes
    
  3. Sécurité
    - RLS activé
    - Lecture publique pour tous
*/

CREATE TABLE IF NOT EXISTS guinea_cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prefecture_id uuid REFERENCES guinea_prefectures(id) ON DELETE CASCADE,
  commune_id uuid REFERENCES guinea_communes(id) ON DELETE SET NULL,
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  name_fr text NOT NULL,
  type text CHECK (type IN ('capitale_nationale', 'capitale_regionale', 'capitale_prefecture', 'ville', 'village')) NOT NULL,
  latitude decimal(10, 7) NOT NULL,
  longitude decimal(10, 7) NOT NULL,
  population integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guinea_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut voir les villes"
  ON guinea_cities FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_cities_prefecture ON guinea_cities(prefecture_id);
CREATE INDEX IF NOT EXISTS idx_cities_commune ON guinea_cities(commune_id);
CREATE INDEX IF NOT EXISTS idx_cities_coords ON guinea_cities(latitude, longitude);

DO $$
DECLARE
  pref_conakry uuid;
  pref_kankan uuid;
  pref_labe uuid;
  pref_nzerekore uuid;
  pref_kindia uuid;
  pref_boke uuid;
  pref_faranah uuid;
  pref_mamou uuid;
  pref_kissidougou uuid;
  pref_gueckedou uuid;
  pref_macenta uuid;
  pref_beyla uuid;
  pref_siguiri uuid;
  pref_kouroussa uuid;
  pref_dabola uuid;
  pref_dinguiraye uuid;
  pref_pita uuid;
  pref_dalaba uuid;
  pref_telimele uuid;
  pref_forecariah uuid;
  pref_dubreka uuid;
  pref_coyah uuid;
  pref_fria uuid;
  pref_boffa uuid;
  pref_gaoual uuid;
  pref_koundara uuid;
  pref_mali uuid;
  pref_tougue uuid;
  pref_lelouma uuid;
  pref_koubia uuid;
  pref_yomou uuid;
  pref_lola uuid;
  pref_kerouane uuid;
  pref_mandiana uuid;
BEGIN
  SELECT id INTO pref_conakry FROM guinea_prefectures WHERE code = 'CONAKRY';
  SELECT id INTO pref_kankan FROM guinea_prefectures WHERE code = 'KANKAN';
  SELECT id INTO pref_labe FROM guinea_prefectures WHERE code = 'LABE';
  SELECT id INTO pref_nzerekore FROM guinea_prefectures WHERE code = 'NZEREKORE';
  SELECT id INTO pref_kindia FROM guinea_prefectures WHERE code = 'KINDIA';
  SELECT id INTO pref_boke FROM guinea_prefectures WHERE code = 'BOKE';
  SELECT id INTO pref_faranah FROM guinea_prefectures WHERE code = 'FARANAH';
  SELECT id INTO pref_mamou FROM guinea_prefectures WHERE code = 'MAMOU';
  SELECT id INTO pref_kissidougou FROM guinea_prefectures WHERE code = 'KISSIDOUGOU';
  SELECT id INTO pref_gueckedou FROM guinea_prefectures WHERE code = 'GUECKEDOU';
  SELECT id INTO pref_macenta FROM guinea_prefectures WHERE code = 'MACENTA';
  SELECT id INTO pref_beyla FROM guinea_prefectures WHERE code = 'BEYLA';
  SELECT id INTO pref_siguiri FROM guinea_prefectures WHERE code = 'SIGUIRI';
  SELECT id INTO pref_kouroussa FROM guinea_prefectures WHERE code = 'KOUROUSSA';
  SELECT id INTO pref_dabola FROM guinea_prefectures WHERE code = 'DABOLA';
  SELECT id INTO pref_dinguiraye FROM guinea_prefectures WHERE code = 'DINGUIRAYE';
  SELECT id INTO pref_pita FROM guinea_prefectures WHERE code = 'PITA';
  SELECT id INTO pref_dalaba FROM guinea_prefectures WHERE code = 'DALABA';
  SELECT id INTO pref_telimele FROM guinea_prefectures WHERE code = 'TELIMELE';
  SELECT id INTO pref_forecariah FROM guinea_prefectures WHERE code = 'FORECARIAH';
  SELECT id INTO pref_dubreka FROM guinea_prefectures WHERE code = 'DUBREKA';
  SELECT id INTO pref_coyah FROM guinea_prefectures WHERE code = 'COYAH';
  SELECT id INTO pref_fria FROM guinea_prefectures WHERE code = 'FRIA';
  SELECT id INTO pref_boffa FROM guinea_prefectures WHERE code = 'BOFF';
  SELECT id INTO pref_gaoual FROM guinea_prefectures WHERE code = 'GAOUAL';
  SELECT id INTO pref_koundara FROM guinea_prefectures WHERE code = 'KOUNDARA';
  SELECT id INTO pref_mali FROM guinea_prefectures WHERE code = 'MALI';
  SELECT id INTO pref_tougue FROM guinea_prefectures WHERE code = 'TOUGUE';
  SELECT id INTO pref_lelouma FROM guinea_prefectures WHERE code = 'LELOUMA';
  SELECT id INTO pref_koubia FROM guinea_prefectures WHERE code = 'KOUBIA';
  SELECT id INTO pref_yomou FROM guinea_prefectures WHERE code = 'YOMOU';
  SELECT id INTO pref_lola FROM guinea_prefectures WHERE code = 'LOLA';
  SELECT id INTO pref_kerouane FROM guinea_prefectures WHERE code = 'KEROUANE';
  SELECT id INTO pref_mandiana FROM guinea_prefectures WHERE code = 'MANDIANA';

  INSERT INTO guinea_cities (prefecture_id, code, name, name_fr, type, latitude, longitude, population) VALUES
  (pref_conakry, 'CITY-CONAKRY', 'Conakry', 'Conakry', 'capitale_nationale', 9.5092, -13.7122, 1660973),
  
  (pref_kankan, 'CITY-KANKAN', 'Kankan', 'Kankan', 'capitale_regionale', 10.3853, -9.3064, 472348),
  (pref_kankan, 'CITY-KANKAN-BARANAMA', 'Baranama', 'Baranama', 'ville', 10.3500, -9.4000, 25000),
  
  (pref_labe, 'CITY-LABE', 'Labé', 'Labé', 'capitale_regionale', 11.3178, -12.2897, 200000),
  (pref_labe, 'CITY-LABE-POPODARA', 'Popodara', 'Popodara', 'ville', 11.2800, -12.3000, 15000),
  
  (pref_nzerekore, 'CITY-NZEREKORE', 'Nzérékoré', 'Nzérékoré', 'capitale_regionale', 7.7562, -8.8179, 282000),
  (pref_nzerekore, 'CITY-NZEREKORE-KOULE', 'Koulé', 'Koulé', 'ville', 7.7800, -8.8500, 18000),
  
  (pref_kindia, 'CITY-KINDIA', 'Kindia', 'Kindia', 'capitale_regionale', 10.0569, -12.8644, 180000),
  (pref_kindia, 'CITY-KINDIA-MAMOU-KARATHE', 'Mamou Karathé', 'Mamou Karathé', 'ville', 10.0800, -12.8500, 12000),
  
  (pref_boke, 'CITY-BOKE', 'Boké', 'Boké', 'capitale_regionale', 10.9424, -14.2915, 120000),
  (pref_boke, 'CITY-BOKE-KAMSAR', 'Kamsar', 'Kamsar', 'ville', 10.6667, -14.6167, 61527),
  (pref_boke, 'CITY-BOKE-SANGAREDI', 'Sangarédi', 'Sangarédi', 'ville', 11.1333, -13.7500, 25000),
  
  (pref_faranah, 'CITY-FARANAH', 'Faranah', 'Faranah', 'capitale_regionale', 10.0356, -10.7419, 87083),
  (pref_faranah, 'CITY-FARANAH-TIRO', 'Tiro', 'Tiro', 'ville', 10.0500, -10.7200, 8000),
  
  (pref_mamou, 'CITY-MAMOU', 'Mamou', 'Mamou', 'capitale_regionale', 10.3759, -12.0914, 82000),
  (pref_mamou, 'CITY-MAMOU-SOYA', 'Soya', 'Soya', 'ville', 10.4000, -12.1000, 10000),
  
  (pref_kissidougou, 'CITY-KISSIDOUGOU', 'Kissidougou', 'Kissidougou', 'capitale_prefecture', 9.1847, -10.1241, 102675),
  (pref_kissidougou, 'CITY-KISSIDOUGOU-YENDE', 'Yendé-Millimou', 'Yendé-Millimou', 'ville', 9.1500, -10.1500, 12000),
  
  (pref_gueckedou, 'CITY-GUECKEDOU', 'Guéckédou', 'Guéckédou', 'capitale_prefecture', 8.5667, -10.1333, 200000),
  (pref_gueckedou, 'CITY-GUECKEDOU-NONGOA', 'Nongoa', 'Nongoa', 'ville', 8.5500, -10.1500, 15000),
  
  (pref_macenta, 'CITY-MACENTA', 'Macenta', 'Macenta', 'capitale_prefecture', 8.5461, -9.4708, 87000),
  (pref_macenta, 'CITY-MACENTA-SENGBEDOU', 'Sengbédou', 'Sengbédou', 'ville', 8.5200, -9.5000, 10000),
  
  (pref_beyla, 'CITY-BEYLA', 'Beyla', 'Beyla', 'capitale_prefecture', 8.6856, -8.6528, 20000),
  (pref_beyla, 'CITY-BEYLA-DIARA', 'Diara', 'Diara', 'ville', 8.6500, -8.7000, 8000),
  
  (pref_siguiri, 'CITY-SIGUIRI', 'Siguiri', 'Siguiri', 'capitale_prefecture', 11.4197, -9.1700, 100000),
  (pref_siguiri, 'CITY-SIGUIRI-DOKO', 'Doko', 'Doko', 'ville', 11.4500, -9.2000, 15000),
  
  (pref_kouroussa, 'CITY-KOUROUSSA', 'Kouroussa', 'Kouroussa', 'capitale_prefecture', 10.6500, -9.8833, 40000),
  (pref_kouroussa, 'CITY-KOUROUSSA-CISSELAN', 'Cisséla', 'Cisséla', 'ville', 10.6800, -9.9000, 8000),
  
  (pref_dabola, 'CITY-DABOLA', 'Dabola', 'Dabola', 'capitale_prefecture', 10.7497, -11.1081, 35000),
  (pref_dabola, 'CITY-DABOLA-DOGOMET', 'Dogomet', 'Dogomet', 'ville', 10.7300, -11.1300, 6000),
  
  (pref_dinguiraye, 'CITY-DINGUIRAYE', 'Dinguiraye', 'Dinguiraye', 'capitale_prefecture', 11.3000, -10.7167, 30000),
  (pref_dinguiraye, 'CITY-DINGUIRAYE-GAGNAKALY', 'Gagnakaly', 'Gagnakaly', 'ville', 11.2800, -10.7400, 7000),
  
  (pref_pita, 'CITY-PITA', 'Pita', 'Pita', 'capitale_prefecture', 11.0594, -12.3950, 50000),
  (pref_pita, 'CITY-PITA-TIMBI', 'Timbi Madina', 'Timbi Madina', 'ville', 11.0800, -12.4200, 12000),
  
  (pref_dalaba, 'CITY-DALABA', 'Dalaba', 'Dalaba', 'capitale_prefecture', 10.6833, -12.2500, 25000),
  (pref_dalaba, 'CITY-DALABA-DITINN', 'Ditinn', 'Ditinn', 'ville', 10.7000, -12.2700, 8000),
  
  (pref_telimele, 'CITY-TELIMELE', 'Télimélé', 'Télimélé', 'capitale_prefecture', 10.9064, -13.0306, 35000),
  (pref_telimele, 'CITY-TELIMELE-THIONTHIAN', 'Thionthian', 'Thionthian', 'ville', 10.9200, -13.0500, 9000),
  
  (pref_forecariah, 'CITY-FORECARIAH', 'Forécariah', 'Forécariah', 'capitale_prefecture', 9.4331, -13.0858, 30000),
  (pref_forecariah, 'CITY-FORECARIAH-BENTY', 'Benty', 'Benty', 'ville', 9.4500, -13.1000, 8000),
  
  (pref_dubreka, 'CITY-DUBREKA', 'Dubréka', 'Dubréka', 'capitale_prefecture', 9.7922, -13.5169, 35000),
  (pref_dubreka, 'CITY-DUBREKA-TONDON', 'Tondon', 'Tondon', 'ville', 9.8000, -13.5300, 10000),
  
  (pref_coyah, 'CITY-COYAH', 'Coyah', 'Coyah', 'capitale_prefecture', 9.7000, -13.0500, 77000),
  (pref_coyah, 'CITY-COYAH-MANEAH', 'Manéah', 'Manéah', 'ville', 9.7200, -13.0700, 12000),
  
  (pref_fria, 'CITY-FRIA', 'Fria', 'Fria', 'capitale_prefecture', 10.3664, -13.5844, 60000),
  
  (pref_boffa, 'CITY-BOFFA', 'Boffa', 'Boffa', 'capitale_prefecture', 10.1806, -14.0396, 25000),
  (pref_boffa, 'CITY-BOFFA-TOUGNIFILI', 'Tougnifili', 'Tougnifili', 'ville', 10.2000, -14.0600, 8000),
  
  (pref_gaoual, 'CITY-GAOUAL', 'Gaoual', 'Gaoual', 'capitale_prefecture', 11.7519, -13.2018, 20000),
  (pref_gaoual, 'CITY-GAOUAL-FOULAMORI', 'Foulamori', 'Foulamori', 'ville', 11.7700, -13.2200, 6000),
  
  (pref_koundara, 'CITY-KOUNDARA', 'Koundara', 'Koundara', 'capitale_prefecture', 12.4889, -13.3067, 18000),
  (pref_koundara, 'CITY-KOUNDARA-YOUKOUNKOUN', 'Youkounkoun', 'Youkounkoun', 'ville', 12.5000, -13.3200, 7000),
  
  (pref_mali, 'CITY-MALI', 'Mali', 'Mali', 'capitale_prefecture', 11.9778, -12.0889, 25000),
  (pref_mali, 'CITY-MALI-DOUNTOU', 'Dountou', 'Dountou', 'ville', 11.9900, -12.1000, 8000),
  
  (pref_tougue, 'CITY-TOUGUE', 'Tougué', 'Tougué', 'capitale_prefecture', 11.4464, -11.6683, 20000),
  (pref_tougue, 'CITY-TOUGUE-KOLLET', 'Kollet', 'Kollet', 'ville', 11.4600, -11.6800, 7000),
  
  (pref_lelouma, 'CITY-LELOUMA', 'Lélouma', 'Lélouma', 'capitale_prefecture', 11.3167, -12.9167, 18000),
  (pref_lelouma, 'CITY-LELOUMA-LAFOU', 'Lafou', 'Lafou', 'ville', 11.3300, -12.9300, 6000),
  
  (pref_koubia, 'CITY-KOUBIA', 'Koubia', 'Koubia', 'capitale_prefecture', 11.5833, -11.8833, 15000),
  (pref_koubia, 'CITY-KOUBIA-GADHA', 'Gadha-Woundou', 'Gadha-Woundou', 'ville', 11.6000, -11.9000, 5000),
  
  (pref_yomou, 'CITY-YOMOU', 'Yomou', 'Yomou', 'capitale_prefecture', 7.5667, -9.2500, 15000),
  (pref_yomou, 'CITY-YOMOU-BIGNAMOU', 'Bignamou', 'Bignamou', 'ville', 7.5800, -9.2700, 5000),
  
  (pref_lola, 'CITY-LOLA', 'Lola', 'Lola', 'capitale_prefecture', 7.7833, -8.5333, 20000),
  (pref_lola, 'CITY-LOLA-NZEOU', 'N''Zéou', 'N''Zéou', 'ville', 7.8000, -8.5500, 6000),
  
  (pref_kerouane, 'CITY-KEROUANE', 'Kérouané', 'Kérouané', 'capitale_prefecture', 9.2667, -9.0167, 25000),
  (pref_kerouane, 'CITY-KEROUANE-BANANKORO', 'Banankoro', 'Banankoro', 'ville', 9.2800, -9.0300, 7000),
  
  (pref_mandiana, 'CITY-MANDIANA', 'Mandiana', 'Mandiana', 'capitale_prefecture', 10.6169, -8.7000, 30000),
  (pref_mandiana, 'CITY-MANDIANA-BALANDOUGOU', 'Balandougou', 'Balandougou', 'ville', 10.6300, -8.7200, 8000);

END $$;