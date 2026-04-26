/*
  # Complete RLS Policies for all tables
  
  Drops any existing policies first, then creates fresh ones.
*/

-- Drop all existing policies
DO $$ 
DECLARE pol RECORD; tbl text;
  tables text[] := ARRAY[
    'app_users','profiles','clients','technicians','technician_gps_tracking',
    'services','service_items','chantiers','quote_requests','quotes',
    'invoices','planning','planning_technicians','chantier_activities',
    'appointments','project_photos','projects','conversations','messages',
    'call_signals','call_history','work_sessions','work_session_events',
    'user_real_time_status','work_shifts','user_locations','shared_locations',
    'tarifs_horaires','heures_travail','fiches_paie','absences',
    'contrats_maintenance','visites_contrat','installations_client',
    'historique_interventions_installation','evaluations_techniciens','urgences',
    'expenses','stock_items','stock_movements','guinea_regions',
    'guinea_prefectures','guinea_communes','guinea_districts','guinea_villages',
    'guinea_cities','admin_settings','admin_alerts','admin_broadcasts',
    'notifications','notification_settings','chatbot_conversations','incidents',
    'birthdays','daily_notes','legal_terms_acceptance','legal_signatures',
    'non_compete_signatures','contact_messages','payment_records',
    'site_images','site_notes','reports','reviews','stocks','mission_trips',
    'worksite_completions'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = tbl LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ===== CORE =====
CREATE POLICY "p1" ON app_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON app_users FOR SELECT TO anon USING (true);
CREATE POLICY "p3" ON app_users FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "p4" ON app_users FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "p5" ON app_users FOR DELETE TO authenticated USING (id = auth.uid() OR is_admin_user());

CREATE POLICY "p1" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON profiles FOR INSERT TO authenticated WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "p3" ON profiles FOR UPDATE TO authenticated USING (id = (SELECT auth.uid())) WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "p1" ON clients FOR SELECT TO authenticated USING (is_admin_or_office() OR profile_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON clients FOR INSERT TO authenticated WITH CHECK (is_admin_or_office() OR profile_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON clients FOR UPDATE TO authenticated USING (is_admin_or_office() OR profile_id = (SELECT auth.uid())) WITH CHECK (is_admin_or_office() OR profile_id = (SELECT auth.uid()));

CREATE POLICY "p1" ON technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON technicians FOR INSERT TO authenticated WITH CHECK (is_admin_or_office() OR profile_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON technicians FOR UPDATE TO authenticated USING (is_admin_or_office() OR profile_id = (SELECT auth.uid())) WITH CHECK (is_admin_or_office() OR profile_id = (SELECT auth.uid()));

CREATE POLICY "p1" ON technician_gps_tracking FOR SELECT TO authenticated USING (is_admin_or_office() OR user_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON technician_gps_tracking FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "p1" ON services FOR SELECT USING (true);
CREATE POLICY "p2" ON services FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON services FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());

CREATE POLICY "p1" ON service_items FOR SELECT USING (true);

-- ===== CHANTIERS & QUOTES =====
CREATE POLICY "p1" ON chantiers FOR SELECT TO authenticated USING (is_admin_or_office() OR client_id = (SELECT auth.uid()) OR technician_id::text IN (SELECT profile_id::text FROM technicians WHERE profile_id = (SELECT auth.uid())) OR id IN (SELECT p.chantier_id FROM planning p JOIN planning_technicians pt ON pt.planning_id = p.id JOIN technicians t ON t.id = pt.technician_id WHERE t.profile_id = (SELECT auth.uid())));
CREATE POLICY "p2" ON chantiers FOR SELECT TO anon USING (is_public = true);
CREATE POLICY "p3" ON chantiers FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON chantiers FOR UPDATE TO authenticated USING (is_admin_or_office() OR technician_id::text IN (SELECT profile_id::text FROM technicians WHERE profile_id = (SELECT auth.uid())) OR id IN (SELECT p.chantier_id FROM planning p JOIN planning_technicians pt ON pt.planning_id = p.id JOIN technicians t ON t.id = pt.technician_id WHERE t.profile_id = (SELECT auth.uid()))) WITH CHECK (is_admin_or_office() OR technician_id::text IN (SELECT profile_id::text FROM technicians WHERE profile_id = (SELECT auth.uid())) OR id IN (SELECT p.chantier_id FROM planning p JOIN planning_technicians pt ON pt.planning_id = p.id JOIN technicians t ON t.id = pt.technician_id WHERE t.profile_id = (SELECT auth.uid())));
CREATE POLICY "p5" ON chantiers FOR DELETE TO authenticated USING (is_admin_or_office());

CREATE POLICY "p1" ON quote_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "p2" ON quote_requests FOR SELECT TO authenticated USING (is_admin_or_office() OR user_id = (SELECT auth.uid()) OR email = (SELECT email FROM app_users WHERE id = (SELECT auth.uid())));
CREATE POLICY "p3" ON quote_requests FOR SELECT TO anon USING (tracking_number IS NOT NULL);
CREATE POLICY "p4" ON quote_requests FOR UPDATE TO authenticated USING (is_admin_or_office() OR user_id = (SELECT auth.uid())) WITH CHECK (is_admin_or_office() OR user_id = (SELECT auth.uid()));
CREATE POLICY "p5" ON quote_requests FOR DELETE TO authenticated USING (is_admin_or_office());

CREATE POLICY "p1" ON quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON quotes FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON quotes FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());

-- ===== INVOICES & PLANNING =====
CREATE POLICY "p1" ON invoices FOR SELECT TO authenticated USING (is_admin_or_office() OR client_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON invoices FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON invoices FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON invoices FOR DELETE TO authenticated USING (is_admin_or_office());

CREATE POLICY "p1" ON planning FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON planning FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON planning FOR UPDATE TO authenticated USING (is_admin_or_office()) WITH CHECK (is_admin_or_office());
CREATE POLICY "p4" ON planning FOR DELETE TO authenticated USING (is_admin_or_office());

CREATE POLICY "p1" ON planning_technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON planning_technicians FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());
CREATE POLICY "p3" ON planning_technicians FOR DELETE TO authenticated USING (is_admin_or_office());

CREATE POLICY "p1" ON chantier_activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON chantier_activities FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()) OR is_admin_or_office());

CREATE POLICY "p1" ON appointments FOR SELECT TO authenticated USING (is_admin_or_office() OR user_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON appointments FOR SELECT TO anon USING (true);
CREATE POLICY "p3" ON appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "p4" ON appointments FOR UPDATE TO authenticated USING (is_admin_or_office() OR user_id = (SELECT auth.uid())) WITH CHECK (is_admin_or_office() OR user_id = (SELECT auth.uid()));

CREATE POLICY "p1" ON project_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON project_photos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "p1" ON projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON projects FOR INSERT TO authenticated WITH CHECK (is_admin_or_office());

-- ===== MESSAGING =====
CREATE POLICY "p1" ON conversations FOR SELECT TO authenticated USING (participant_1_id = (SELECT auth.uid()) OR participant_2_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON conversations FOR INSERT TO authenticated WITH CHECK ((participant_1_id = (SELECT auth.uid()) OR participant_2_id = (SELECT auth.uid())) AND check_communication_permission(participant_1_id, participant_2_id));

CREATE POLICY "p1" ON messages FOR SELECT TO authenticated USING (conversation_id IN (SELECT id FROM conversations WHERE participant_1_id = (SELECT auth.uid()) OR participant_2_id = (SELECT auth.uid())));
CREATE POLICY "p2" ON messages FOR INSERT TO authenticated WITH CHECK (sender_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON messages FOR UPDATE TO authenticated USING (conversation_id IN (SELECT id FROM conversations WHERE participant_1_id = (SELECT auth.uid()) OR participant_2_id = (SELECT auth.uid())));

CREATE POLICY "p1" ON call_signals FOR SELECT TO authenticated USING (caller_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON call_signals FOR INSERT TO authenticated WITH CHECK (caller_id = (SELECT auth.uid()) AND check_communication_permission((SELECT auth.uid()), receiver_id));
CREATE POLICY "p3" ON call_signals FOR UPDATE TO authenticated USING (caller_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));
CREATE POLICY "p4" ON call_signals FOR DELETE TO authenticated USING (caller_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

CREATE POLICY "p1" ON call_history FOR SELECT TO authenticated USING (caller_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));
CREATE POLICY "p2" ON call_history FOR INSERT TO authenticated WITH CHECK (caller_id = (SELECT auth.uid()));

-- ===== WORK TRACKING =====
CREATE POLICY "p1" ON work_sessions FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON work_sessions FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON work_sessions FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());

CREATE POLICY "p1" ON work_session_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON work_session_events FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "p1" ON user_real_time_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON user_real_time_status FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON user_real_time_status FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());

CREATE POLICY "p1" ON work_shifts FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());
CREATE POLICY "p2" ON work_shifts FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON work_shifts FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()) OR is_admin_or_office());

CREATE POLICY "p1" ON user_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON user_locations FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "p3" ON user_locations FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE POLICY "p1" ON shared_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON shared_locations FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));