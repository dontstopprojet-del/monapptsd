/*
  # Correction de l'accès anonyme pour toutes les tables géographiques
  
  1. Modifications
    - Ajoute des politiques permettant aux visiteurs anonymes de voir:
      - Les régions de Guinée
      - Les préfectures de Guinée
      - Les communes de Guinée
      - Les districts de Guinée
    - Permet à tous de consulter la carte géographique sans connexion
  
  2. Sécurité
    - Lecture seule pour tous
    - Aucune modification possible par les anonymes
    - Les données géographiques sont publiques
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'guinea_regions' 
    AND policyname = 'Les visiteurs peuvent voir les régions'
  ) THEN
    CREATE POLICY "Les visiteurs peuvent voir les régions"
      ON guinea_regions FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'guinea_prefectures' 
    AND policyname = 'Les visiteurs peuvent voir les préfectures'
  ) THEN
    CREATE POLICY "Les visiteurs peuvent voir les préfectures"
      ON guinea_prefectures FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'guinea_communes' 
    AND policyname = 'Les visiteurs peuvent voir les communes'
  ) THEN
    CREATE POLICY "Les visiteurs peuvent voir les communes"
      ON guinea_communes FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'guinea_districts' 
    AND policyname = 'Les visiteurs peuvent voir les districts'
  ) THEN
    CREATE POLICY "Les visiteurs peuvent voir les districts"
      ON guinea_districts FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;