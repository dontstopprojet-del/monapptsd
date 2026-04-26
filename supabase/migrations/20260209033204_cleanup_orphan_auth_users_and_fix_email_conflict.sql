/*
  # Nettoyage des Utilisateurs Auth Orphelins et Correction des Conflits

  1. Problème
    - Des utilisateurs auth existent sans profil app_users correspondant
    - La contrainte unique sur l'email empêche la création de profils quand l'email existe déjà
    - Des tentatives d'inscription précédentes ont créé des comptes auth orphelins

  2. Solution
    - Supprimer les comptes auth orphelins (auth.users sans app_users correspondant)
    - Modifier la fonction create_user_profile pour gérer les conflits d'email
    - Ajouter une vérification pour éviter les doublons

  3. Sécurité
    - Suppression sécurisée des comptes orphelins
    - Préservation des données existantes
*/

-- Supprimer les comptes auth qui n'ont pas de profil correspondant
-- Cela nettoie les comptes créés par des tentatives d'inscription échouées
DO $$
DECLARE
  orphan_record RECORD;
BEGIN
  FOR orphan_record IN 
    SELECT au.id
    FROM auth.users au
    LEFT JOIN public.app_users u ON au.id = u.id
    WHERE u.id IS NULL
  LOOP
    DELETE FROM auth.users WHERE id = orphan_record.id;
  END LOOP;
END $$;

-- Modifier la fonction create_user_profile pour ajouter une contrainte sur l'email aussi
DROP FUNCTION IF EXISTS public.create_user_profile;

CREATE OR REPLACE FUNCTION public.create_user_profile(
  p_user_id uuid,
  p_email text,
  p_name text,
  p_role text,
  p_phone text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_contract_signature_date date DEFAULT NULL,
  p_marital_status text DEFAULT NULL,
  p_contract_number text DEFAULT NULL,
  p_echelon text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_office_position text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_created_date text DEFAULT NULL,
  p_mad text DEFAULT NULL,
  p_creation_location text DEFAULT NULL,
  p_district text DEFAULT NULL,
  p_postal_code text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_result json;
  v_existing_id uuid;
BEGIN
  -- Vérifier si un utilisateur avec cet email existe déjà
  SELECT id INTO v_existing_id FROM public.app_users WHERE email = p_email;
  
  -- Si l'email existe déjà avec un id différent, lever une erreur explicite
  IF v_existing_id IS NOT NULL AND v_existing_id != p_user_id THEN
    RAISE EXCEPTION 'Un compte avec cet email existe déjà. Veuillez vous connecter.';
  END IF;

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
    p_user_id,
    p_email,
    p_name,
    p_role,
    p_phone,
    p_date_of_birth,
    p_contract_signature_date,
    p_marital_status,
    p_contract_number,
    p_echelon,
    p_status,
    p_office_position,
    p_city,
    p_created_date,
    p_mad,
    p_creation_location,
    p_district,
    p_postal_code,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    role = EXCLUDED.role,
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
    updated_at = now()
  RETURNING to_json(app_users.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permettre aux utilisateurs authentifiés et anonymes d'appeler cette fonction
GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated, anon;
