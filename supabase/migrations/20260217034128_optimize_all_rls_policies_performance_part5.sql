/*
  # Optimize All RLS Policies for Performance - Part 5
  
  ## Tables Covered
  - appointments
  - chatbot_conversations
  - planning_technicians
  - payment_records
  - site_images
  - site_notes
  - technician_gps_tracking
*/

-- =====================================================
-- APPOINTMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can update all appointments" ON public.appointments;
CREATE POLICY "Admins can update all appointments" ON public.appointments
  FOR UPDATE
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

DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
CREATE POLICY "Admins can view all appointments" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create their own appointments" ON public.appointments;
CREATE POLICY "Authenticated users can create their own appointments" ON public.appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Clients can update their own pending appointments" ON public.appointments;
CREATE POLICY "Clients can update their own pending appointments" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()) AND status = 'pending')
  WITH CHECK (user_id = (select auth.uid()) AND status = 'pending');

DROP POLICY IF EXISTS "Clients can view their own appointments" ON public.appointments;
CREATE POLICY "Clients can view their own appointments" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Technicians can update their assigned appointments" ON public.appointments;
CREATE POLICY "Technicians can update their assigned appointments" ON public.appointments
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'tech'
    )
  )
  WITH CHECK (
    assigned_to = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'tech'
    )
  );

DROP POLICY IF EXISTS "Technicians can view their assigned appointments" ON public.appointments;
CREATE POLICY "Technicians can view their assigned appointments" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (
    assigned_to = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'tech'
    )
  );

-- =====================================================
-- CHATBOT_CONVERSATIONS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can create own chatbot conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can create own chatbot conversations" ON public.chatbot_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own chatbot conversations" ON public.chatbot_conversations;
CREATE POLICY "Users can view own chatbot conversations" ON public.chatbot_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- PLANNING_TECHNICIANS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins et office peuvent créer les assignations" ON public.planning_technicians;
CREATE POLICY "Admins et office peuvent créer les assignations" ON public.planning_technicians
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins et office peuvent modifier les assignations" ON public.planning_technicians;
CREATE POLICY "Admins et office peuvent modifier les assignations" ON public.planning_technicians
  FOR UPDATE
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

DROP POLICY IF EXISTS "Admins et office peuvent supprimer les assignations" ON public.planning_technicians;
CREATE POLICY "Admins et office peuvent supprimer les assignations" ON public.planning_technicians
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins et techniciens peuvent voir les assignations" ON public.planning_technicians;
CREATE POLICY "Admins et techniciens peuvent voir les assignations" ON public.planning_technicians
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
-- PAYMENT_RECORDS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Users can view own payment records" ON public.payment_records;
CREATE POLICY "Users can view own payment records" ON public.payment_records
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
-- SITE_IMAGES TABLE
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
-- SITE_NOTES TABLE
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
-- TECHNICIAN_GPS_TRACKING TABLE
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