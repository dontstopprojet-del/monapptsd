/*
  # Reset Complet de Production - Nettoyage Total des Données

  ## Objectif
  Supprimer TOUTES les données de test/production pour repartir sur une base propre.
  
  ## Tables vidées
  1. **Données métier**
     - `projects` - Tous les projets
     - `expenses` - Toutes les dépenses
     - `invoices` - Toutes les factures
     - `stock_items` - Tous les articles de stock
     - `stock_movements` - Tous les mouvements de stock
     - `planning` - Tous les plannings
     - `chantiers` - Tous les chantiers
     
  2. **Données utilisateurs**
     - `conversations` - Toutes les conversations
     - `messages` - Tous les messages
     - `notifications` - Toutes les notifications
     - `admin_alerts` - Toutes les alertes
     - `daily_notes` - Toutes les notes quotidiennes
     - `incidents` - Tous les incidents
     - `birthdays` - Tous les anniversaires
     - `work_shifts` - Toutes les pauses/horaires
     
  3. **Données clients et techniciens**
     - `clients` - Tous les clients
     - `technicians` - Tous les techniciens
     - `reviews` - Tous les avis
     - `reports` - Tous les rapports
     
  4. **Données système**
     - `site_images` - Toutes les images
     - `site_notes` - Toutes les notes de site
     - `user_locations` - Toutes les positions GPS
     - `contact_messages` - Tous les messages de contact
     - `quote_requests` - Toutes les demandes de devis
     
  ## Conservation
  - Structure des tables (schéma intact)
  - Compte admin principal (si role = 'admin')
  - Triggers et fonctions
  - Politiques RLS
  
  ## Notes importantes
  ⚠️ Cette migration supprime DÉFINITIVEMENT toutes les données
  ⚠️ Aucun retour en arrière possible
  ⚠️ À utiliser UNIQUEMENT pour reset complet
*/

-- Désactiver temporairement les triggers
SET session_replication_role = 'replica';

-- 1. Supprimer les données dépendantes en premier (respects des FK)
TRUNCATE TABLE stock_movements CASCADE;
TRUNCATE TABLE expenses CASCADE;
TRUNCATE TABLE invoices CASCADE;
TRUNCATE TABLE planning CASCADE;
TRUNCATE TABLE messages CASCADE;
TRUNCATE TABLE conversations CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE chantiers CASCADE;
TRUNCATE TABLE mission_trips CASCADE;

-- 2. Supprimer les données utilisateurs et métier
TRUNCATE TABLE daily_notes CASCADE;
TRUNCATE TABLE incidents CASCADE;
TRUNCATE TABLE birthdays CASCADE;
TRUNCATE TABLE work_shifts CASCADE;
TRUNCATE TABLE site_images CASCADE;
TRUNCATE TABLE site_notes CASCADE;
TRUNCATE TABLE user_locations CASCADE;
TRUNCATE TABLE technician_gps_tracking CASCADE;
TRUNCATE TABLE worksite_completions CASCADE;
TRUNCATE TABLE payment_records CASCADE;

-- 3. Supprimer les notifications et alertes
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE admin_alerts CASCADE;
TRUNCATE TABLE contact_messages CASCADE;
TRUNCATE TABLE quote_requests CASCADE;

-- 4. Supprimer les données projet et stock
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE project_photos CASCADE;
TRUNCATE TABLE stock_items CASCADE;
TRUNCATE TABLE reports CASCADE;

-- 5. Supprimer les données clients et techniciens
TRUNCATE TABLE technicians CASCADE;
TRUNCATE TABLE clients CASCADE;
TRUNCATE TABLE services CASCADE;
TRUNCATE TABLE service_items CASCADE;

-- 6. Supprimer les signatures et settings (sauf admin_settings si on veut garder la config)
TRUNCATE TABLE legal_terms_acceptance CASCADE;
TRUNCATE TABLE legal_signatures CASCADE;
TRUNCATE TABLE non_compete_signatures CASCADE;
TRUNCATE TABLE notification_settings CASCADE;

-- 7. Supprimer les données système
TRUNCATE TABLE shared_locations CASCADE;
TRUNCATE TABLE quotes CASCADE;
TRUNCATE TABLE stocks CASCADE;
TRUNCATE TABLE trigger_error_log CASCADE;

-- 8. Supprimer tous les utilisateurs SAUF les admins
DELETE FROM app_users WHERE role != 'admin';

-- 9. Supprimer les profils orphelins (qui ne sont pas liés à un admin)
DELETE FROM profiles 
WHERE id NOT IN (
  SELECT id FROM auth.users WHERE id IN (
    SELECT id FROM app_users WHERE role = 'admin'
  )
);

-- Réactiver les triggers
SET session_replication_role = 'origin';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Reset complet terminé avec succès';
  RAISE NOTICE '✅ Toutes les données ont été supprimées';
  RAISE NOTICE '✅ Structure des tables conservée';
  RAISE NOTICE '✅ Comptes admin conservés';
END $$;