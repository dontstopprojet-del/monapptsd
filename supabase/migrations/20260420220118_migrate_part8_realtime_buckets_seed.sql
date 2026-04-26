/*
  # Part 8: Realtime, Storage Buckets, Seed Data
  
  Storage policies already exist from previous migrations.
  Only adding: realtime publication, storage buckets, seed data.
*/

-- Enable realtime for key tables
DO $$
DECLARE
  tbl text;
  tbls text[] := ARRAY[
    'quote_requests', 'appointments', 'notifications', 'messages',
    'chantiers', 'invoices', 'incidents', 'daily_notes', 'work_shifts',
    'planning_technicians', 'call_signals', 'chantier_activities',
    'admin_broadcasts', 'tarifs_horaires', 'heures_travail', 'fiches_paie',
    'installations_client', 'historique_interventions_installation',
    'evaluations_techniciens', 'urgences', 'contrats_maintenance', 'visites_contrat'
  ];
BEGIN
  FOREACH tbl IN ARRAY tbls
  LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END LOOP;
END $$;

-- Create storage buckets (if not exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('public-files', 'public-files', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('message-files', 'message-files', true, NULL, NULL),
  ('payment-proofs', 'payment-proofs', true, NULL, NULL),
  ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Seed data: admin_settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type)
VALUES 
  ('legal_terms_fr', '', 'text'),
  ('legal_terms_en', '', 'text'),
  ('company_info', '{}', 'json'),
  ('chatbot_context', '', 'text')
ON CONFLICT (setting_key) DO NOTHING;

-- Seed data: tarifs_horaires
INSERT INTO tarifs_horaires (categorie, role, tarif_client_gnf, tarif_client_eur, salaire_horaire_gnf)
VALUES
  ('technicien', 'Apprenti', 100000, 10, 25000),
  ('technicien', 'Aide Plombier', 150000, 15, 37500),
  ('technicien', 'Plombier', 200000, 20, 50000),
  ('technicien', 'Plombier confirme', 250000, 25, 62500),
  ('technicien', 'Chef Plombier', 300000, 30, 75000),
  ('technicien', 'Electricien', 200000, 20, 50000),
  ('technicien', 'Electricien confirme', 250000, 25, 62500),
  ('technicien', 'Soudeur', 250000, 25, 62500),
  ('technicien', 'Chef Equipe', 350000, 35, 87500),
  ('employe_bureau', 'Secretaire', 0, 0, 40000),
  ('employe_bureau', 'Comptable', 0, 0, 50000),
  ('employe_bureau', 'RH', 0, 0, 50000),
  ('employe_bureau', 'Magasinier', 0, 0, 35000),
  ('employe_bureau', 'Directeur', 0, 0, 100000)
ON CONFLICT (categorie, role) DO NOTHING;
