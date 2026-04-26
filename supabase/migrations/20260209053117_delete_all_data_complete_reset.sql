/*
  # Reset complet de toutes les données
  
  1. Suppression
    - Supprime toutes les données de toutes les tables dans le bon ordre
    - Respecte les contraintes de clés étrangères
    - Supprime également les utilisateurs auth.users
  
  2. Notes importantes
    - Cette migration vide complètement la base de données
    - Permet un test depuis zéro
    - Tous les comptes utilisateurs seront supprimés
*/

-- Suppression des données des tables dépendantes en premier
DELETE FROM admin_alerts;
DELETE FROM site_images;
DELETE FROM site_notes;
DELETE FROM payment_records;
DELETE FROM birthdays;
DELETE FROM incidents;
DELETE FROM non_compete_signatures;
DELETE FROM daily_notes;
DELETE FROM worksite_completions;
DELETE FROM notifications;
DELETE FROM work_shifts;
DELETE FROM technician_gps_tracking;
DELETE FROM legal_terms_acceptance;
DELETE FROM reports;
DELETE FROM mission_trips;
DELETE FROM reviews;
DELETE FROM planning;
DELETE FROM chantiers;
DELETE FROM service_items;
DELETE FROM services;
DELETE FROM technicians;
DELETE FROM clients;
DELETE FROM profiles;
DELETE FROM project_photos;
DELETE FROM projects;
DELETE FROM shared_locations;
DELETE FROM legal_signatures;
DELETE FROM stocks;
DELETE FROM notification_settings;
DELETE FROM admin_settings;
DELETE FROM trigger_error_log;

-- Suppression des app_users
DELETE FROM app_users;

-- Suppression des utilisateurs auth (nécessite les permissions admin)
DELETE FROM auth.users;
