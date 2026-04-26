/*
  # Mettre à jour les champs d'information de l'entreprise

  1. Modifications
    - Retirer les valeurs par défaut des champs created_date, mad, creation_location, district, postal_code
    - Ces champs sont maintenant NULL par défaut
    - Seuls les administrateurs auront ces champs remplis lors de l'inscription

  2. Notes
    - Les valeurs existantes dans la base de données ne sont pas modifiées
    - Les nouveaux comptes n'auront plus ces valeurs par défaut
*/

-- Retirer les valeurs par défaut pour les champs d'information de l'entreprise
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'created_date'
  ) THEN
    ALTER TABLE app_users ALTER COLUMN created_date DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'mad'
  ) THEN
    ALTER TABLE app_users ALTER COLUMN mad DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'creation_location'
  ) THEN
    ALTER TABLE app_users ALTER COLUMN creation_location DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'district'
  ) THEN
    ALTER TABLE app_users ALTER COLUMN district DROP DEFAULT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE app_users ALTER COLUMN postal_code DROP DEFAULT;
  END IF;
END $$;
