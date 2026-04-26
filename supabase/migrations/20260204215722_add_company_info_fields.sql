/*
  # Ajouter les champs d'information de l'entreprise

  1. Modifications
    - Ajout de `created_date` (date de création du compte)
    - Ajout de `mad` (Mise à disposition)
    - Ajout de `creation_location` (lieu de création)
    - Ajout de `district` (quartier)
    - Ajout de `postal_code` (code postal)

  2. Valeurs par défaut
    - created_date: 12-11-2025
    - mad: Salimatou
    - creation_location: Belgique
    - district: TROOZ
    - postal_code: 4870

  3. Notes
    - Ces champs sont optionnels et peuvent être vides
    - Les valeurs par défaut sont appliquées uniquement pour les nouveaux comptes
*/

-- Ajouter les nouveaux champs à la table app_users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'created_date'
  ) THEN
    ALTER TABLE app_users ADD COLUMN created_date text DEFAULT '12-11-2025';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'mad'
  ) THEN
    ALTER TABLE app_users ADD COLUMN mad text DEFAULT 'Salimatou';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'creation_location'
  ) THEN
    ALTER TABLE app_users ADD COLUMN creation_location text DEFAULT 'Belgique';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'district'
  ) THEN
    ALTER TABLE app_users ADD COLUMN district text DEFAULT 'TROOZ';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE app_users ADD COLUMN postal_code text DEFAULT '4870';
  END IF;
END $$;
