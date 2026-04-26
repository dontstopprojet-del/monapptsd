/*
  # Système de notification automatique pour les devis

  1. Fonctionnalités
    - Notification automatique quand un devis passe en statut "quoted"
    - Notification automatique quand un devis est accepté/refusé
    - Le client reçoit une alerte dans son interface
  
  2. Sécurité
    - Trigger automatique sans action manuelle requise
    - Les notifications sont visibles par le client concerné
*/

-- Fonction pour créer une notification quand un devis est envoyé
CREATE OR REPLACE FUNCTION notify_quote_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut passe à "quoted" (devis envoyé)
  IF NEW.status = 'quoted' AND (OLD.status IS NULL OR OLD.status != 'quoted') THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      created_at
    ) VALUES (
      NEW.user_id,
      'success',
      'Votre devis est prêt !',
      'Votre devis ' || NEW.tracking_number || ' est maintenant disponible. Prix: ' || 
      COALESCE(NEW.estimated_price::text, 'à définir') || ' GNF. Consultez-le pour accepter ou refuser.',
      now()
    );
  END IF;

  -- Si le devis est accepté par le client
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN
    -- Notifier les admins/office
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      created_at
    )
    SELECT 
      au.id,
      'success',
      'Devis accepté',
      'Le devis ' || NEW.tracking_number || ' a été accepté par ' || NEW.name,
      now()
    FROM app_users au
    WHERE au.role IN ('admin', 'office');
  END IF;

  -- Si le devis est refusé par le client
  IF NEW.status = 'rejected' AND (OLD.status IS NULL OR OLD.status != 'rejected') THEN
    -- Notifier les admins/office
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      created_at
    )
    SELECT 
      au.id,
      'warning',
      'Devis refusé',
      'Le devis ' || NEW.tracking_number || ' a été refusé par ' || NEW.name || '. Raison: ' || COALESCE(NEW.rejected_reason, 'Non spécifiée'),
      now()
    FROM app_users au
    WHERE au.role IN ('admin', 'office');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_notify_quote_status ON quote_requests;
CREATE TRIGGER trigger_notify_quote_status
  AFTER UPDATE ON quote_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_quote_status_change();

-- Autoriser les utilisateurs à voir leurs propres notifications
DROP POLICY IF EXISTS "users_view_own_notifications" ON notifications;
CREATE POLICY "users_view_own_notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Créer une notification test pour le devis existant
DO $$
DECLARE
  v_quote_record RECORD;
BEGIN
  -- Récupérer le devis quoted
  SELECT * INTO v_quote_record
  FROM quote_requests
  WHERE tracking_number = 'DEV-20260215-0287'
  AND status = 'quoted'
  LIMIT 1;

  -- Si le devis existe et qu'il a un user_id
  IF FOUND AND v_quote_record.user_id IS NOT NULL THEN
    -- Supprimer les anciennes notifications pour ce devis
    DELETE FROM notifications
    WHERE message LIKE '%' || v_quote_record.tracking_number || '%';
    
    -- Créer la notification
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      created_at
    ) VALUES (
      v_quote_record.user_id,
      'success',
      'Votre devis est prêt !',
      'Votre devis ' || v_quote_record.tracking_number || ' est maintenant disponible. Prix: ' || 
      COALESCE(v_quote_record.estimated_price::text, 'à définir') || ' GNF. Consultez-le pour accepter ou refuser.',
      now()
    );
    
    RAISE NOTICE 'Notification créée pour user_id: %', v_quote_record.user_id;
  ELSE
    RAISE NOTICE 'Aucun devis trouvé ou pas de user_id';
  END IF;
END $$;
