/*
  # Fix chantiers.client_id foreign key reference

  1. Problem
    - chantiers.client_id has a FK to clients.id
    - But the entire app (frontend, RLS policies) uses app_users.id as the client_id value
    - This causes insert failures when auto-creating chantiers from accepted quotes

  2. Fix
    - Drop the incorrect FK referencing clients table
    - Add a correct FK referencing app_users table
    - This aligns the DB constraint with how the app actually works
*/

ALTER TABLE chantiers DROP CONSTRAINT IF EXISTS chantiers_client_id_fkey;

ALTER TABLE chantiers 
  ADD CONSTRAINT chantiers_client_id_fkey 
  FOREIGN KEY (client_id) REFERENCES app_users(id) ON DELETE SET NULL;
