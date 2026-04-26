/*
  # Fix daily_notes schema and apply remaining RLS policies
*/

-- Fix daily_notes: add missing columns
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_notes' AND column_name = 'is_shared') THEN
    ALTER TABLE daily_notes ADD COLUMN is_shared boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_notes' AND column_name = 'note_date') THEN
    ALTER TABLE daily_notes ADD COLUMN note_date date DEFAULT CURRENT_DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_notes' AND column_name = 'content') THEN
    ALTER TABLE daily_notes ADD COLUMN content text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_notes' AND column_name = 'shared_with') THEN
    ALTER TABLE daily_notes ADD COLUMN shared_with text[] DEFAULT '{}';
  END IF;
END $$;

-- Now apply remaining policies
-- tarifs_horaires
CREATE POLICY "p1" ON tarifs_horaires FOR SELECT TO authenticated USING (true);
CREATE POLICY "p1a" ON tarifs_horaires FOR SELECT TO anon USING (true);
CREATE POLICY "p2" ON tarifs_horaires FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON tarifs_horaires FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());

-- heures_travail
CREATE POLICY "p1" ON heures_travail FOR SELECT TO authenticated USING (employe_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON heures_travail FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON heures_travail FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON heures_travail FOR DELETE TO authenticated USING (is_admin_or_office());

-- fiches_paie
CREATE POLICY "p1" ON fiches_paie FOR SELECT TO authenticated USING (employe_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON fiches_paie FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON fiches_paie FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON fiches_paie FOR DELETE TO authenticated USING (is_admin_or_office());

-- absences
CREATE POLICY "p1" ON absences FOR SELECT TO authenticated USING (employe_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON absences FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON absences FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON absences FOR DELETE TO authenticated USING (is_admin_or_office());

-- contrats_maintenance
CREATE POLICY "p1" ON contrats_maintenance FOR SELECT TO authenticated USING (client_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON contrats_maintenance FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON contrats_maintenance FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON contrats_maintenance FOR DELETE TO authenticated USING (is_admin_or_office());

-- visites_contrat
CREATE POLICY "p1" ON visites_contrat FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON visites_contrat FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON visites_contrat FOR UPDATE TO authenticated USING (is_admin_or_office() OR technicien_id = (SELECT auth.uid())) WITH CHECK (is_admin_or_office() OR technicien_id = (SELECT auth.uid()));

-- installations_client
CREATE POLICY "p1" ON installations_client FOR SELECT TO authenticated USING (client_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON installations_client FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON installations_client FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());

-- historique_interventions_installation
CREATE POLICY "p1" ON historique_interventions_installation FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON historique_interventions_installation FOR INSERT TO authenticated WITH CHECK (is_admin_or_office() OR technicien_id = (SELECT auth.uid()));

-- evaluations_techniciens
CREATE POLICY "p1" ON evaluations_techniciens FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON evaluations_techniciens FOR INSERT TO authenticated WITH CHECK (client_id = (SELECT auth.uid()) OR is_admin_or_office());

-- urgences
CREATE POLICY "p1" ON urgences FOR SELECT TO authenticated USING (client_id = (SELECT auth.uid()) OR technicien_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON urgences FOR INSERT TO authenticated WITH CHECK (client_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p3" ON urgences FOR UPDATE TO authenticated USING (is_admin_or_office() OR technicien_id = (SELECT auth.uid())) WITH CHECK (is_admin_or_office() OR technicien_id = (SELECT auth.uid()));

-- expenses
CREATE POLICY "p1" ON expenses FOR SELECT TO authenticated USING (technician_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON expenses FOR INSERT TO authenticated WITH CHECK (technician_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p3" ON expenses FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());

-- stock_items
CREATE POLICY "p1" ON stock_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON stock_items FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON stock_items FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON stock_items FOR DELETE TO authenticated USING (is_admin_or_office());

-- stock_movements
CREATE POLICY "p1" ON stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON stock_movements FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON stock_movements FOR DELETE TO authenticated USING (is_admin_or_office());

-- Guinea geography tables
CREATE POLICY "p1" ON guinea_regions FOR SELECT USING (true);
CREATE POLICY "p1" ON guinea_prefectures FOR SELECT USING (true);
CREATE POLICY "p1" ON guinea_communes FOR SELECT USING (true);
CREATE POLICY "p1" ON guinea_districts FOR SELECT USING (true);
CREATE POLICY "p1" ON guinea_villages FOR SELECT USING (true);
CREATE POLICY "p1" ON guinea_cities FOR SELECT USING (true);

-- admin_settings
CREATE POLICY "p1" ON admin_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON admin_settings FOR INSERT TO authenticated WITH CHECK (is_admin_user());
CREATE POLICY "p3" ON admin_settings FOR UPDATE TO authenticated USING (is_admin_user()) WITH CHECK (is_admin_user());

-- admin_alerts
CREATE POLICY "p1" ON admin_alerts FOR SELECT TO authenticated USING (is_admin_or_office() OR recipient_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON admin_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "p3" ON admin_alerts FOR UPDATE TO authenticated USING (is_admin_or_office() OR recipient_id = (SELECT auth.uid()));

-- admin_broadcasts
CREATE POLICY "p1" ON admin_broadcasts FOR SELECT USING (true);
CREATE POLICY "p2" ON admin_broadcasts FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON admin_broadcasts FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON admin_broadcasts FOR DELETE TO authenticated USING (is_admin_or_office());

-- notifications
CREATE POLICY "p1" ON notifications FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "p3" ON notifications FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());

-- notification_settings
CREATE POLICY "p1" ON notification_settings FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON notification_settings FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON notification_settings FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

-- chatbot_conversations
CREATE POLICY "p1" ON chatbot_conversations FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON chatbot_conversations FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

-- incidents
CREATE POLICY "p1" ON incidents FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON incidents FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON incidents FOR UPDATE TO authenticated USING (is_admin_or_office());

-- birthdays
CREATE POLICY "p1" ON birthdays FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON birthdays FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

-- daily_notes
CREATE POLICY "p1" ON daily_notes FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_shared = true OR is_admin_or_office());
CREATE POLICY "p2" ON daily_notes FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON daily_notes FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "p4" ON daily_notes FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

-- legal_terms_acceptance
CREATE POLICY "p1" ON legal_terms_acceptance FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON legal_terms_acceptance FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON legal_terms_acceptance FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

-- legal_signatures
CREATE POLICY "p1" ON legal_signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON legal_signatures FOR INSERT TO authenticated WITH CHECK (true);

-- non_compete_signatures
CREATE POLICY "p1" ON non_compete_signatures FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON non_compete_signatures FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON non_compete_signatures FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

-- contact_messages
CREATE POLICY "p1" ON contact_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "p2" ON contact_messages FOR SELECT TO authenticated USING (is_admin_or_office());
CREATE POLICY "p3" ON contact_messages FOR UPDATE TO authenticated USING (is_admin_or_office());

-- payment_records
CREATE POLICY "p1" ON payment_records FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON payment_records FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());

-- site_images
CREATE POLICY "p1" ON site_images FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON site_images FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) OR is_admin_or_office());

-- site_notes
CREATE POLICY "p1" ON site_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON site_notes FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p3" ON site_notes FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());

-- reports
CREATE POLICY "p1" ON reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON reports FOR INSERT TO authenticated WITH CHECK (true);

-- reviews
CREATE POLICY "p1" ON reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON reviews FOR INSERT TO authenticated WITH CHECK (client_id = (SELECT auth.uid()));

-- stocks
CREATE POLICY "p1" ON stocks FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON stocks FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());

-- mission_trips
CREATE POLICY "p1" ON mission_trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON mission_trips FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());

-- worksite_completions
CREATE POLICY "p1" ON worksite_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON worksite_completions FOR INSERT TO authenticated WITH CHECK (true);