/*
  # Amélioration du Trigger de Création d'Utilisateur

  1. Problème
    - Le trigger actuel crée uniquement les champs de base (id, email, name, role)
    - Le code frontend doit ensuite faire un UPDATE pour ajouter les autres champs
    - Cela peut causer des erreurs de timing ou de permissions

  2. Solution
    - Améliorer le trigger pour extraire et sauvegarder tous les champs depuis raw_user_meta_data
    - Éliminer le besoin d'un UPDATE séparé après l'inscription

  3. Champs gérés
    - Champs de base: id, email, name, role
    - Informations personnelles: phone, date_of_birth, marital_status, contract_signature_date
    - Champs spécifiques au rôle: contract_number, echelon, status, office_position, city
    - Champs admin: created_date, mad, creation_location, district, postal_code

  4. Sécurité
    - Le trigger s'exécute avec SECURITY DEFINER pour contourner les RLS
    - Les données proviennent de raw_user_meta_data qui est contrôlé par le backend
*/

-- Supprimer l'ancien trigger et la fonction
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Créer la fonction améliorée pour gérer la création d'utilisateur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.app_users (
    id,
    email,
    name,
    role,
    phone,
    date_of_birth,
    contract_signature_date,
    marital_status,
    contract_number,
    echelon,
    status,
    office_position,
    city,
    created_date,
    mad,
    creation_location,
    district,
    postal_code,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    new.raw_user_meta_data->>'phone',
    CASE 
      WHEN new.raw_user_meta_data->>'date_of_birth' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'date_of_birth')::date
      ELSE NULL
    END,
    CASE 
      WHEN new.raw_user_meta_data->>'contract_signature_date' IS NOT NULL 
      THEN (new.raw_user_meta_data->>'contract_signature_date')::date
      ELSE NULL
    END,
    new.raw_user_meta_data->>'marital_status',
    new.raw_user_meta_data->>'contract_number',
    new.raw_user_meta_data->>'echelon',
    new.raw_user_meta_data->>'status',
    new.raw_user_meta_data->>'office_position',
    new.raw_user_meta_data->>'city',
    new.raw_user_meta_data->>'created_date',
    new.raw_user_meta_data->>'mad',
    new.raw_user_meta_data->>'creation_location',
    new.raw_user_meta_data->>'district',
    new.raw_user_meta_data->>'postal_code',
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    phone = EXCLUDED.phone,
    date_of_birth = EXCLUDED.date_of_birth,
    contract_signature_date = EXCLUDED.contract_signature_date,
    marital_status = EXCLUDED.marital_status,
    contract_number = EXCLUDED.contract_number,
    echelon = EXCLUDED.echelon,
    status = EXCLUDED.status,
    office_position = EXCLUDED.office_position,
    city = EXCLUDED.city,
    created_date = EXCLUDED.created_date,
    mad = EXCLUDED.mad,
    creation_location = EXCLUDED.creation_location,
    district = EXCLUDED.district,
    postal_code = EXCLUDED.postal_code,
    updated_at = now();
    
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
