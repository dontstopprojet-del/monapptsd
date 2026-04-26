/*
  # Ajouter une fonction RPC pour créer le profil utilisateur

  1. Problème
    - Le trigger automatique peut ne pas fonctionner dans tous les scénarios
    - Besoin d'une méthode fiable pour créer/mettre à jour le profil utilisateur

  2. Solution
    - Créer une fonction RPC que le frontend peut appeler explicitement
    - Cette fonction crée ou met à jour l'entrée app_users
    - Utilise SECURITY DEFINER pour contourner les RLS si nécessaire

  3. Utilisation
    - Le frontend appelle cette fonction après auth.signUp()
    - Passe tous les champs nécessaires en paramètres
    - La fonction gère l'insertion/mise à jour de manière sûre
*/

-- Créer une fonction RPC pour créer/mettre à jour le profil utilisateur
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
