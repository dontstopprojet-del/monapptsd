/*
  # Activation de la Création Automatique de Profils

  1. Nouvelle Fonction
    - `handle_new_app_user` : Gère la création automatique des profils et notifications
    - Créé un profil dans `profiles` si le rôle est tech ou client
    - Créé une entrée dans `technicians` si le rôle est tech
    - Créé une entrée dans `clients` si le rôle est client
    - Envoie une notification à tous les admins

  2. Nouveau Trigger
    - S'exécute après chaque INSERT dans `app_users`
    - Appelle la fonction `handle_new_app_user`

  3. Sécurité
    - La fonction s'exécute avec les privilèges du créateur (SECURITY DEFINER)
    - Gestion robuste des erreurs
*/

-- Fonction pour gérer les nouveaux utilisateurs app_users
CREATE OR REPLACE FUNCTION public.handle_new_app_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_profile_id uuid;
  admin_rec RECORD;
BEGIN
  -- Si c'est un technicien ou un client, créer un profil
  IF NEW.role IN ('tech', 'client') THEN
    -- Créer le profil
    INSERT INTO public.profiles (id, full_name, phone, role)
    VALUES (
      gen_random_uuid(),
      NEW.name,
      NEW.phone,
      NEW.role
    )
    RETURNING id INTO new_profile_id;

    -- Si c'est un technicien, créer l'entrée technician
    IF NEW.role = 'tech' THEN
      INSERT INTO public.technicians (
        profile_id,
        role_level,
        status,
        satisfaction_rate,
        total_revenue,
        contract_date
      ) VALUES (
        new_profile_id,
        'Tech',
        'Dispo',
        100,
        0,
        COALESCE(NEW.contract_date, CURRENT_DATE)
      );
    END IF;

    -- Si c'est un client, créer l'entrée client
    IF NEW.role = 'client' THEN
      INSERT INTO public.clients (
        profile_id,
        location,
        total_interventions,
        total_spent,
        badge,
        contract_date
      ) VALUES (
        new_profile_id,
        NULL,
        0,
        0,
        'regular',
        COALESCE(NEW.contract_date, CURRENT_DATE)
      );
    END IF;
  END IF;

  -- Envoyer une notification à tous les admins
  FOR admin_rec IN 
    SELECT id FROM public.app_users WHERE role = 'admin'
  LOOP
    INSERT INTO public.admin_alerts (
      recipient_id,
      alert_type,
      title,
      message,
      created_by,
      is_read
    ) VALUES (
      admin_rec.id,
      'general',
      'Nouveau compte créé',
      'Un nouveau compte a été créé : ' || NEW.name || ' (' || NEW.role || ')',
      NEW.id,
      false
    );
  END LOOP;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer l'insertion
    INSERT INTO public.trigger_error_log (
      trigger_name,
      error_message,
      error_detail,
      user_id,
      user_email
    ) VALUES (
      'handle_new_app_user',
      SQLERRM,
      SQLSTATE,
      NEW.id,
      NEW.email
    );
    RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_app_user_created ON public.app_users;

CREATE TRIGGER on_app_user_created
  AFTER INSERT ON public.app_users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_app_user();
