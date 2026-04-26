/*
  # Correction de l'accès anonyme aux villes de Guinée
  
  1. Modifications
    - Ajoute une politique permettant aux utilisateurs anonymes de voir les villes
    - Permet à tous (authentifiés et anonymes) de consulter la carte géographique
  
  2. Sécurité
    - Lecture seule pour tous
    - Aucune modification possible par les anonymes
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'guinea_cities' 
    AND policyname = 'Les visiteurs peuvent voir les villes'
  ) THEN
    CREATE POLICY "Les visiteurs peuvent voir les villes"
      ON guinea_cities FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;