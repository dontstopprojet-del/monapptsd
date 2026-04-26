/*
  # Correction du Trigger avec Gestion d'Erreurs Améliorée

  1. Problème
    - Le trigger peut échouer silencieusement en cas d'erreur
    - Pas de logging pour diagnostiquer les problèmes
    - Les erreurs ne sont pas capturées correctement

  2. Solution
    - Ajouter un bloc EXCEPTION pour capturer les erreurs
    - Logger les erreurs dans une table dédiée
    - Permettre au trigger de ne pas bloquer l'inscription même en cas d'erreur

  3. Sécurité
    - Le trigger continue de s'exécuter avec SECURITY DEFINER
    - Les erreurs sont loggées pour diagnostic
*/

-- Créer une table pour logger les erreurs du trigger
CREATE TABLE IF NOT EXISTS public.trigger_error_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name text NOT NULL,
  error_message text NOT NULL,
  error_detail text,
  user_id uuid,
  user_email text,
  raw_metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Désactiver RLS sur la table de log (seulement pour le système)
ALTER TABLE public.trigger_error_log DISABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Créer la fonction améliorée avec gestion d'erreurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  v_error_message text;
  v_error_detail text;
BEGIN
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
        AND new.raw_user_meta_data->>'date_of_birth' != ''
        THEN (new.raw_user_meta_data->>'date_of_birth')::date
        ELSE NULL
      END,
      CASE 
        WHEN new.raw_user_meta_data->>'contract_signature_date' IS NOT NULL 
        AND new.raw_user_meta_data->>'contract_signature_date' != ''
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
      updated_at = now();
      
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS 
      v_error_message = MESSAGE_TEXT,
      v_error_detail = PG_EXCEPTION_DETAIL;
    
    INSERT INTO public.trigger_error_log (
      trigger_name,
      error_message,
      error_detail,
      user_id,
      user_email,
      raw_metadata
    ) VALUES (
      'handle_new_user',
      v_error_message,
      v_error_detail,
      new.id,
      new.email,
      new.raw_user_meta_data
    );
    
    RAISE WARNING 'Error in handle_new_user trigger: %', v_error_message;
  END;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recréer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
