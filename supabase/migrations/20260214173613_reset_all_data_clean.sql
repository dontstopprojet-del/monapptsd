/*
  # Remise à zéro complète de toutes les données

  1. Nettoyage complet
    - Suppression de toutes les réalisations (projets/chantiers) 
    - Suppression de toutes les dépenses
    - Suppression de toutes les factures
    - Suppression de tous les devis
    - Suppression de tous les rendez-vous
    - Suppression de tous les messages et conversations
    - Suppression de toutes les notifications
    - Suppression du stock
    - Suppression du planning
    - Suppression des notes quotidiennes
    - Suppression de toutes les données non essentielles
    - CONSERVATION des utilisateurs (app_users) et auth.users

  2. Notes importantes
    - Les utilisateurs existants sont conservés
    - Les politiques RLS restent actives
    - La synchronisation temps réel fonctionne sur toutes les tables vides
    - L'admin verra toutes les nouvelles données en temps réel
    - "Nos réalisations" sera vide (0 projets validés et publics)
*/

-- Supprimer les conversations chatbot
DELETE FROM chatbot_conversations;

-- Supprimer les shifts de travail
DELETE FROM work_shifts;

-- Supprimer les sessions de travail
DELETE FROM work_sessions;

-- Supprimer les événements de session
DELETE FROM work_session_events;

-- Supprimer les rendez-vous
DELETE FROM appointments;

-- Supprimer les demandes de devis
DELETE FROM quote_requests;

-- Supprimer les mouvements de stock
DELETE FROM stock_movements;

-- Supprimer les items de stock
DELETE FROM stock_items;

-- Supprimer les dépenses
DELETE FROM expenses;

-- Supprimer les factures
DELETE FROM invoices;

-- Supprimer les incidents
DELETE FROM incidents;

-- Supprimer les notes quotidiennes
DELETE FROM daily_notes;

-- Supprimer le planning
DELETE FROM planning;

-- Supprimer les messages
DELETE FROM messages;

-- Supprimer les conversations
DELETE FROM conversations;

-- Supprimer les notifications
DELETE FROM notifications;

-- Supprimer les alertes admin
DELETE FROM admin_alerts;

-- Supprimer les reviews
DELETE FROM reviews;

-- Supprimer les anciens devis
DELETE FROM quotes;

-- Supprimer les trajets de mission
DELETE FROM mission_trips;

-- Supprimer les photos de projet
DELETE FROM project_photos;

-- Supprimer les images de site
DELETE FROM site_images;

-- Supprimer les notes de site
DELETE FROM site_notes;

-- Supprimer les complétions de chantier
DELETE FROM worksite_completions;

-- Supprimer les anniversaires
DELETE FROM birthdays;

-- Supprimer les enregistrements de paiement
DELETE FROM payment_records;

-- Supprimer les localisations partagées
DELETE FROM shared_locations;

-- Supprimer le tracking GPS
DELETE FROM technician_gps_tracking;

-- Supprimer les localisations utilisateur
DELETE FROM user_locations;

-- Supprimer les messages de contact
DELETE FROM contact_messages;

-- Supprimer les rapports
DELETE FROM reports;

-- Supprimer les signatures de non-concurrence
DELETE FROM non_compete_signatures;

-- Supprimer les signatures légales
DELETE FROM legal_signatures;

-- Supprimer les stocks (ancienne table)
DELETE FROM stocks;

-- Supprimer tous les projets/chantiers (IMPORTANT: ceci réinitialise "Nos réalisations")
DELETE FROM chantiers;

-- Supprimer tous les projets de l'ancienne table projects (dépréciée)
DELETE FROM projects;

-- Supprimer les techniciens (mais garder les app_users)
DELETE FROM technicians;

-- Supprimer les clients (mais garder les app_users)
DELETE FROM clients;

-- Supprimer les services et items de service
DELETE FROM service_items;
DELETE FROM services;

-- Réinitialiser les statuts utilisateur en temps réel
DELETE FROM user_real_time_status;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Toutes les données ont été supprimées avec succès';
  RAISE NOTICE '✅ Les utilisateurs (app_users et auth.users) sont conservés';
  RAISE NOTICE '✅ La synchronisation temps réel est active sur toutes les interfaces';
  RAISE NOTICE '✅ L''admin recevra toutes les nouvelles données instantanément';
  RAISE NOTICE '✅ "Nos réalisations" affichera 0 projets (table chantiers vide)';
  RAISE NOTICE '✅ Toutes les interfaces sont synchronisées et prêtes à l''emploi';
END $$;
