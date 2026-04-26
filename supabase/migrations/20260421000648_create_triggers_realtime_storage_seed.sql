/*
  # Part 8: Triggers, Realtime, Storage Buckets, Seed Data

  1. Triggers for automatic profile creation on app_users insert
  2. Triggers for timestamp updates
  3. Triggers for stock sync
  4. Realtime publication for key tables
  5. Storage buckets
  6. Seed data
*/

-- ===== TRIGGERS =====

-- on_app_user_created -> handle_new_app_user
DROP TRIGGER IF EXISTS on_app_user_created ON app_users;
CREATE TRIGGER on_app_user_created
  AFTER INSERT ON app_users
  FOR EACH ROW EXECUTE FUNCTION handle_new_app_user();

-- trigger_initialize_user_status
DROP TRIGGER IF EXISTS trigger_initialize_user_status ON app_users;
CREATE TRIGGER trigger_initialize_user_status
  AFTER INSERT ON app_users
  FOR EACH ROW EXECUTE FUNCTION initialize_user_status();

-- trigger_sync_technician
DROP TRIGGER IF EXISTS trigger_sync_technician ON app_users;
CREATE TRIGGER trigger_sync_technician
  AFTER INSERT OR UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION sync_technician_profile();

-- set_tracking_number on quote_requests
DROP TRIGGER IF EXISTS set_tracking_number_trigger ON quote_requests;
CREATE TRIGGER set_tracking_number_trigger
  BEFORE INSERT ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION set_tracking_number();

-- set_invoice_number on invoices
DROP TRIGGER IF EXISTS set_invoice_number_trigger ON invoices;
CREATE TRIGGER set_invoice_number_trigger
  BEFORE INSERT ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_invoice_number();

-- update conversation last_message on new message
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON messages;
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_last_message();

-- updated_at triggers
DROP TRIGGER IF EXISTS update_app_users_updated_at ON app_users;
CREATE TRIGGER update_app_users_updated_at
  BEFORE UPDATE ON app_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_chantiers_updated_at ON chantiers;
CREATE TRIGGER update_chantiers_updated_at
  BEFORE UPDATE ON chantiers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_quote_requests_updated_at ON quote_requests;
CREATE TRIGGER update_quote_requests_updated_at
  BEFORE UPDATE ON quote_requests
  FOR EACH ROW EXECUTE FUNCTION update_quote_request_timestamp();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW EXECUTE FUNCTION update_quote_updated_at();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_user_status_timestamp_trigger ON user_real_time_status;
CREATE TRIGGER update_user_status_timestamp_trigger
  BEFORE UPDATE ON user_real_time_status
  FOR EACH ROW EXECUTE FUNCTION update_user_status_timestamp();

DROP TRIGGER IF EXISTS update_contrats_maintenance_updated_at_trigger ON contrats_maintenance;
CREATE TRIGGER update_contrats_maintenance_updated_at_trigger
  BEFORE UPDATE ON contrats_maintenance
  FOR EACH ROW EXECUTE FUNCTION update_contrats_maintenance_updated_at();

DROP TRIGGER IF EXISTS update_installations_updated_at_trigger ON installations_client;
CREATE TRIGGER update_installations_updated_at_trigger
  BEFORE UPDATE ON installations_client
  FOR EACH ROW EXECUTE FUNCTION update_installations_updated_at();

DROP TRIGGER IF EXISTS update_urgences_updated_at_trigger ON urgences;
CREATE TRIGGER update_urgences_updated_at_trigger
  BEFORE UPDATE ON urgences
  FOR EACH ROW EXECUTE FUNCTION update_urgences_updated_at();

DROP TRIGGER IF EXISTS update_visites_contrat_updated_at_trigger ON visites_contrat;
CREATE TRIGGER update_visites_contrat_updated_at_trigger
  BEFORE UPDATE ON visites_contrat
  FOR EACH ROW EXECUTE FUNCTION update_visites_contrat_updated_at();

DROP TRIGGER IF EXISTS update_stock_items_updated_at_trigger ON stock_items;
CREATE TRIGGER update_stock_items_updated_at_trigger
  BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_stock_items_updated_at();

-- Stock sync triggers
DROP TRIGGER IF EXISTS sync_stock_on_movement_insert_trigger ON stock_movements;
CREATE TRIGGER sync_stock_on_movement_insert_trigger
  AFTER INSERT ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION sync_stock_on_movement_insert();

DROP TRIGGER IF EXISTS sync_stock_on_movement_delete_trigger ON stock_movements;
CREATE TRIGGER sync_stock_on_movement_delete_trigger
  AFTER DELETE ON stock_movements
  FOR EACH ROW EXECUTE FUNCTION sync_stock_on_movement_delete();

-- ===== REALTIME =====
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

-- ===== STORAGE BUCKETS =====
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('public-files', 'public-files', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']),
  ('message-files', 'message-files', true, NULL, NULL),
  ('payment-proofs', 'payment-proofs', true, NULL, NULL),
  ('profile-photos', 'profile-photos', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for public-files
CREATE POLICY "auth_upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('public-files', 'message-files', 'payment-proofs', 'profile-photos'));
CREATE POLICY "auth_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id IN ('public-files', 'message-files', 'payment-proofs', 'profile-photos'));
CREATE POLICY "public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('public-files', 'message-files', 'payment-proofs', 'profile-photos'));

-- ===== SEED DATA =====
INSERT INTO admin_settings (setting_key, setting_value, setting_type)
VALUES 
  ('legal_terms_fr', '', 'text'),
  ('legal_terms_en', '', 'text'),
  ('company_info', '{}', 'json'),
  ('chatbot_context', '', 'text')
ON CONFLICT (setting_key) DO NOTHING;

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