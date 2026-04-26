/*
  # Optimize All RLS Policies for Performance

  ## Purpose
  Replace all instances of auth.uid() with (select auth.uid()) in RLS policies.
  This prevents re-evaluation for each row, significantly improving query performance at scale.

  ## Tables Updated
  - profiles, technicians, clients, chantiers, reviews, stocks
  - planning, mission_trips, app_users, legal_terms_acceptance
  - technician_gps_tracking, work_shifts, site_images, site_notes
  - payment_records, birthdays, incidents, non_compete_signatures
  - daily_notes, admin_alerts, worksite_completions, admin_settings
  - projects, notifications, reports, notification_settings
  - conversations, messages, invoices, quotes, quote_requests
  - contact_messages, user_locations, expenses, stock_items
  - stock_movements, work_sessions, work_session_events
  - user_real_time_status, appointments, chatbot_conversations
  - planning_technicians
*/

-- =====================================================
-- CHANTIERS (Projects/Worksites)
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete chantiers" ON public.chantiers;
CREATE POLICY "Admins can delete chantiers" ON public.chantiers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert chantiers" ON public.chantiers;
CREATE POLICY "Admins can insert chantiers" ON public.chantiers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all chantiers" ON public.chantiers;
CREATE POLICY "Admins can update all chantiers" ON public.chantiers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can view all chantiers" ON public.chantiers;
CREATE POLICY "Admins can view all chantiers" ON public.chantiers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view their chantiers" ON public.chantiers;
CREATE POLICY "Clients can view their chantiers" ON public.chantiers
  FOR SELECT TO authenticated
  USING (
    client_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Office can insert chantiers" ON public.chantiers;
CREATE POLICY "Office can insert chantiers" ON public.chantiers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'office'
    )
  );

DROP POLICY IF EXISTS "Office can update all chantiers" ON public.chantiers;
CREATE POLICY "Office can update all chantiers" ON public.chantiers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'office'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'office'
    )
  );

DROP POLICY IF EXISTS "Office can view all chantiers" ON public.chantiers;
CREATE POLICY "Office can view all chantiers" ON public.chantiers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role = 'office'
    )
  );

DROP POLICY IF EXISTS "Technicians can update assigned chantiers" ON public.chantiers;
CREATE POLICY "Technicians can update assigned chantiers" ON public.chantiers
  FOR UPDATE TO authenticated
  USING (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.planning
      WHERE chantier_id = chantiers.id AND technician_id = (select auth.uid())
    )
  )
  WITH CHECK (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.planning
      WHERE chantier_id = chantiers.id AND technician_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Technicians can view assigned chantiers" ON public.chantiers;
CREATE POLICY "Technicians can view assigned chantiers" ON public.chantiers
  FOR SELECT TO authenticated
  USING (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.planning
      WHERE chantier_id = chantiers.id AND technician_id = (select auth.uid())
    )
  );

-- =====================================================
-- REVIEWS
-- =====================================================

DROP POLICY IF EXISTS "Clients can insert reviews" ON public.reviews;
CREATE POLICY "Clients can insert reviews" ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (
    client_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Users can view relevant reviews" ON public.reviews;
CREATE POLICY "Users can view relevant reviews" ON public.reviews
  FOR SELECT TO authenticated
  USING (
    client_id = (select auth.uid()) OR
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- CLIENTS
-- =====================================================

DROP POLICY IF EXISTS "Clients and admins can update clients" ON public.clients;
CREATE POLICY "Clients and admins can update clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (
    profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Clients and admins can view clients" ON public.clients;
CREATE POLICY "Clients and admins can view clients" ON public.clients
  FOR SELECT TO authenticated
  USING (
    profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- STOCKS
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage stocks" ON public.stocks;
CREATE POLICY "Admins can manage stocks" ON public.stocks
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- PLANNING
-- =====================================================

DROP POLICY IF EXISTS "Techs and admins can view planning" ON public.planning;
CREATE POLICY "Techs and admins can view planning" ON public.planning
  FOR SELECT TO authenticated
  USING (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- APP_USERS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can delete own profile" ON public.app_users;
CREATE POLICY "Authenticated users can delete own profile" ON public.app_users
  FOR DELETE TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.app_users;
CREATE POLICY "Authenticated users can insert own profile" ON public.app_users
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.app_users;
CREATE POLICY "Authenticated users can update own profile" ON public.app_users
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- LEGAL_TERMS_ACCEPTANCE
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own legal terms acceptance" ON public.legal_terms_acceptance;
CREATE POLICY "Users can insert own legal terms acceptance" ON public.legal_terms_acceptance
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own legal terms acceptance" ON public.legal_terms_acceptance;
CREATE POLICY "Users can update own legal terms acceptance" ON public.legal_terms_acceptance
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own legal terms acceptance" ON public.legal_terms_acceptance;
CREATE POLICY "Users can view own legal terms acceptance" ON public.legal_terms_acceptance
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- TECHNICIAN_GPS_TRACKING
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own GPS tracking" ON public.technician_gps_tracking;
CREATE POLICY "Users can insert own GPS tracking" ON public.technician_gps_tracking
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own GPS tracking" ON public.technician_gps_tracking;
CREATE POLICY "Users can view own GPS tracking" ON public.technician_gps_tracking
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- SITE_IMAGES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own site images" ON public.site_images;
CREATE POLICY "Users can insert own site images" ON public.site_images
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own site images" ON public.site_images;
CREATE POLICY "Users can view own site images" ON public.site_images
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- SITE_NOTES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own site notes" ON public.site_notes;
CREATE POLICY "Users can insert own site notes" ON public.site_notes
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own site notes" ON public.site_notes;
CREATE POLICY "Users can update own site notes" ON public.site_notes
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own site notes" ON public.site_notes;
CREATE POLICY "Users can view own site notes" ON public.site_notes
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- PAYMENT_RECORDS
-- =====================================================

DROP POLICY IF EXISTS "Users can view own payment records" ON public.payment_records;
CREATE POLICY "Users can view own payment records" ON public.payment_records
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- BIRTHDAYS
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own birthdays" ON public.birthdays;
CREATE POLICY "Users can delete own birthdays" ON public.birthdays
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own birthdays" ON public.birthdays;
CREATE POLICY "Users can insert own birthdays" ON public.birthdays
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own birthdays" ON public.birthdays;
CREATE POLICY "Users can update own birthdays" ON public.birthdays
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own birthdays" ON public.birthdays;
CREATE POLICY "Users can view own birthdays" ON public.birthdays
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- INCIDENTS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own incidents" ON public.incidents;
CREATE POLICY "Users can insert own incidents" ON public.incidents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own incidents" ON public.incidents;
CREATE POLICY "Users can update own incidents" ON public.incidents
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own incidents" ON public.incidents;
CREATE POLICY "Users can view own incidents" ON public.incidents
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- NON_COMPETE_SIGNATURES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own non-compete signatures" ON public.non_compete_signatures;
CREATE POLICY "Users can insert own non-compete signatures" ON public.non_compete_signatures
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own non-compete signatures" ON public.non_compete_signatures;
CREATE POLICY "Users can update own non-compete signatures" ON public.non_compete_signatures
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own non-compete signatures" ON public.non_compete_signatures;
CREATE POLICY "Users can view own non-compete signatures" ON public.non_compete_signatures
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid()) AND role IN ('admin', 'office')
    )
  );