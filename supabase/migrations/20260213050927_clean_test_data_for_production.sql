/*
  # Nettoyage des données de test pour la production

  Cette migration nettoie toutes les données de test pour préparer l'application à la production.
  
  ## Actions effectuées
  
  1. **Suppression des messages et conversations de test**
     - Supprime tous les messages
     - Supprime toutes les conversations
  
  2. **Suppression des messages de contact**
     - Nettoie les demandes de contact de test
  
  3. **Suppression des utilisateurs de test**
     - Garde uniquement le compte admin principal (tidiane@tsdetfils.com)
     - Supprime tous les autres comptes utilisateurs de test
  
  4. **Nettoyage des données liées**
     - Supprime les localisations utilisateurs
     - Supprime les données GPS
     - Nettoie toutes les tables liées aux utilisateurs supprimés
  
  ## Sécurité
  
  Cette migration préserve:
  - Le compte administrateur principal
  - La structure complète de la base de données
  - Toutes les politiques RLS
  
  ## Note importante
  
  Après cette migration, la base sera propre et prête pour la production.
  Seul le compte admin principal restera dans le système.
*/

-- Supprimer les messages
DELETE FROM messages;

-- Supprimer les conversations
DELETE FROM conversations;

-- Supprimer les messages de contact de test
DELETE FROM contact_messages;

-- Supprimer les erreurs de log de trigger
DELETE FROM trigger_error_log;

-- Supprimer les localisations utilisateurs
DELETE FROM user_locations WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer le tracking GPS
DELETE FROM technician_gps_tracking WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les notes quotidiennes
DELETE FROM daily_notes WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les alertes admin
DELETE FROM admin_alerts WHERE recipient_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
) OR created_by IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les incidents
DELETE FROM incidents WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les anniversaires
DELETE FROM birthdays WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les quarts de travail
DELETE FROM work_shifts WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les notes de sites
DELETE FROM site_notes WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les images de sites
DELETE FROM site_images WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les enregistrements de paiement
DELETE FROM payment_records WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les complétions de chantier
DELETE FROM worksite_completions WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les notifications
DELETE FROM notifications WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les acceptations de termes légaux
DELETE FROM legal_terms_acceptance WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les signatures de non-concurrence
DELETE FROM non_compete_signatures WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les paramètres de notification
DELETE FROM notification_settings WHERE user_id IN (
  SELECT id FROM app_users WHERE email != 'tidiane@tsdetfils.com'
);

-- Supprimer les utilisateurs de test (garder uniquement l'admin principal)
DELETE FROM app_users WHERE email != 'tidiane@tsdetfils.com';

-- Nettoyer les utilisateurs auth orphelins
DELETE FROM auth.users WHERE email != 'tidiane@tsdetfils.com';
