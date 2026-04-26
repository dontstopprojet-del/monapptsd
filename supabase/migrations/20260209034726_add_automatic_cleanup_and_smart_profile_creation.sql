/*
  # Nettoyage Automatique et Création Intelligente de Profils

  1. Problème Identifié
    - Des profils app_users existent sans compte auth correspondant (profils orphelins)
    - Des comptes auth sont créés avec des emails qui existent déjà dans app_users
    - Conflit: nouveau compte auth ne peut pas créer son profil car l'email existe déjà

  2. Solution
    - Nettoyer tous les comptes auth sans profil correspondant
    - Modifier create_user_profile pour détecter et gérer les profils orphelins
    - Si un profil orphelin existe avec le même email, le mettre à jour avec le nouvel ID auth
    - Cela permet de "réactiver" d'anciens comptes

  3. Sécurité
    - Validation stricte avant toute mise à jour
    - Logs pour traçabilité
    - Transaction atomique pour garantir la cohérence
*/

-- Nettoyer tous les comptes auth orphelins (auth.users sans app_users)
DO $$
DECLARE
  orphan_record RECORD;
  deleted_count INTEGER := 0;
BEGIN
  FOR orphan_record IN 
    SELECT au.id, au.email
    FROM auth.users au
    LEFT JOIN public.app_users u ON au.id = u.id
    WHERE u.id IS NULL
  LOOP
    DELETE FROM auth.users WHERE id = orphan_record.id;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Nettoyage terminé: % compte(s) auth orphelin(s) supprimé(s)', deleted_count;
END $$;

-- Recréer la fonction create_user_profile avec logique de récupération de profils orphelins
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
  v_existing_profile RECORD;
BEGIN
  -- Vérifier si un profil avec cet email existe déjà
  SELECT * INTO v_existing_profile FROM public.app_users WHERE email = p_email;
  
  -- Cas 1: Profil existe avec un ID différent (profil orphelin potentiel)
  IF v_existing_profile.id IS NOT NULL AND v_existing_profile.id != p_user_id THEN
    -- Vérifier si le profil existant est vraiment orphelin (pas de compte auth)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = v_existing_profile.id) THEN
      -- C'est un profil orphelin, on le met à jour avec le nouvel ID
      RAISE NOTICE 'Récupération du profil orphelin pour email: %', p_email;
      
      -- Supprimer l'ancien profil
      DELETE FROM public.app_users WHERE id = v_existing_profile.id;
      
      -- Créer le nouveau profil avec le bon ID
      INSERT INTO public.app_users (
        id, email, name, role, phone, date_of_birth, 
        contract_signature_date, marital_status, contract_number, 
        echelon, status, office_position, city, created_date, 
        mad, creation_location, district, postal_code,
        created_at, updated_at
      )
      VALUES (
        p_user_id, p_email, p_name, p_role, p_phone, p_date_of_birth,
        p_contract_signature_date, p_marital_status, p_contract_number,
        p_echelon, p_status, p_office_position, p_city, p_created_date,
        p_mad, p_creation_location, p_district, p_postal_code,
        now(), now()
      )
      RETURNING to_json(app_users.*) INTO v_result;
      
      RETURN v_result;
    ELSE
      -- Le profil a un compte auth valide, c'est un vrai doublon
      RAISE EXCEPTION 'Un compte avec cet email existe déjà. Veuillez vous connecter.';
    END IF;
  END IF;

  -- Cas 2: Pas de profil existant OU profil avec le même ID
  INSERT INTO public.app_users (
    id, email, name, role, phone, date_of_birth,
    contract_signature_date, marital_status, contract_number,
    echelon, status, office_position, city, created_date,
    mad, creation_location, district, postal_code,
    created_at, updated_at
  )
  VALUES (
    p_user_id, p_email, p_name, p_role, p_phone, p_date_of_birth,
    p_contract_signature_date, p_marital_status, p_contract_number,
    p_echelon, p_status, p_office_position, p_city, p_created_date,
    p_mad, p_creation_location, p_district, p_postal_code,
    now(), now()
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

GRANT EXECUTE ON FUNCTION public.create_user_profile TO authenticated, anon;
