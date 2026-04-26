/*
  # Optimize All Remaining RLS Policies - Part 4
  
  ## Tables Covered
  - site_notes
  - site_images
  - technician_gps_tracking
  - legal_terms_acceptance
  - app_users
  - planning
  - stocks
  - reviews
  - clients
  - chantiers (many policies)
*/

-- =====================================================
-- SITE_NOTES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own site notes" ON public.site_notes;
CREATE POLICY "Users can insert own site notes" ON public.site_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own site notes" ON public.site_notes;
CREATE POLICY "Users can update own site notes" ON public.site_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own site notes" ON public.site_notes;
CREATE POLICY "Users can view own site notes" ON public.site_notes
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- SITE_IMAGES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own site images" ON public.site_images;
CREATE POLICY "Users can insert own site images" ON public.site_images
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own site images" ON public.site_images;
CREATE POLICY "Users can view own site images" ON public.site_images
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- TECHNICIAN_GPS_TRACKING
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own GPS tracking" ON public.technician_gps_tracking;
CREATE POLICY "Users can insert own GPS tracking" ON public.technician_gps_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own GPS tracking" ON public.technician_gps_tracking;
CREATE POLICY "Users can view own GPS tracking" ON public.technician_gps_tracking
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- LEGAL_TERMS_ACCEPTANCE
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own legal terms acceptance" ON public.legal_terms_acceptance;
CREATE POLICY "Users can insert own legal terms acceptance" ON public.legal_terms_acceptance
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own legal terms acceptance" ON public.legal_terms_acceptance;
CREATE POLICY "Users can update own legal terms acceptance" ON public.legal_terms_acceptance
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own legal terms acceptance" ON public.legal_terms_acceptance;
CREATE POLICY "Users can view own legal terms acceptance" ON public.legal_terms_acceptance
  FOR SELECT
  TO authenticated
  USING (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- APP_USERS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can delete own profile" ON public.app_users;
CREATE POLICY "Authenticated users can delete own profile" ON public.app_users
  FOR DELETE
  TO authenticated
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can insert own profile" ON public.app_users;
CREATE POLICY "Authenticated users can insert own profile" ON public.app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (id = (select auth.uid()));

DROP POLICY IF EXISTS "Authenticated users can update own profile" ON public.app_users;
CREATE POLICY "Authenticated users can update own profile" ON public.app_users
  FOR UPDATE
  TO authenticated
  USING (id = (select auth.uid()))
  WITH CHECK (id = (select auth.uid()));

-- =====================================================
-- PLANNING
-- =====================================================

DROP POLICY IF EXISTS "Techs and admins can view planning" ON public.planning;
CREATE POLICY "Techs and admins can view planning" ON public.planning
  FOR SELECT
  TO authenticated
  USING (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office', 'tech')
    )
  );

-- =====================================================
-- STOCKS
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage stocks" ON public.stocks;
CREATE POLICY "Admins can manage stocks" ON public.stocks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- REVIEWS
-- =====================================================

DROP POLICY IF EXISTS "Clients can insert reviews" ON public.reviews;
CREATE POLICY "Clients can insert reviews" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'client'
    )
  );

DROP POLICY IF EXISTS "Users can view relevant reviews" ON public.reviews;
CREATE POLICY "Users can view relevant reviews" ON public.reviews
  FOR SELECT
  TO authenticated
  USING (
    client_id = (select auth.uid()) OR
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- CLIENTS
-- =====================================================

DROP POLICY IF EXISTS "Clients and admins can update clients" ON public.clients;
CREATE POLICY "Clients and admins can update clients" ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Clients and admins can view clients" ON public.clients;
CREATE POLICY "Clients and admins can view clients" ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    profile_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );