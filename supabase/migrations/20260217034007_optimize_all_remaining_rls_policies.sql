/*
  # Optimize All Remaining RLS Policies - Part 1
  
  ## Purpose
  Optimize RLS policies by wrapping auth.uid() in SELECT statements to prevent
  re-evaluation for each row, significantly improving query performance.
  
  ## Tables Covered
  - quote_requests
  - stock_items
  - stock_movements
  - appointments
  - planning_technicians
  - chatbot_conversations
  - user_locations
*/

-- =====================================================
-- QUOTE_REQUESTS
-- =====================================================

DROP POLICY IF EXISTS "admin_and_office_delete_quotes" ON public.quote_requests;
CREATE POLICY "admin_and_office_delete_quotes" ON public.quote_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "admin_and_office_update_all_quotes" ON public.quote_requests;
CREATE POLICY "admin_and_office_update_all_quotes" ON public.quote_requests
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

DROP POLICY IF EXISTS "auth_insert_quotes" ON public.quote_requests;
CREATE POLICY "auth_insert_quotes" ON public.quote_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "auth_update_own_quotes" ON public.quote_requests;
CREATE POLICY "auth_update_own_quotes" ON public.quote_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- STOCK_ITEMS
-- =====================================================

DROP POLICY IF EXISTS "Admins can create stock items" ON public.stock_items;
CREATE POLICY "Admins can create stock items" ON public.stock_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins can delete stock items" ON public.stock_items;
CREATE POLICY "Admins can delete stock items" ON public.stock_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins can update stock items" ON public.stock_items;
CREATE POLICY "Admins can update stock items" ON public.stock_items
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

-- =====================================================
-- STOCK_MOVEMENTS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete stock movements" ON public.stock_movements;
CREATE POLICY "Admins can delete stock movements" ON public.stock_movements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins can update stock movements" ON public.stock_movements;
CREATE POLICY "Admins can update stock movements" ON public.stock_movements
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

DROP POLICY IF EXISTS "Authenticated users can create stock movements" ON public.stock_movements;
CREATE POLICY "Authenticated users can create stock movements" ON public.stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- APPOINTMENTS
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
  USING (assigned_to = (select auth.uid()))
  WITH CHECK (assigned_to = (select auth.uid()));

DROP POLICY IF EXISTS "Technicians can view their assigned appointments" ON public.appointments;
CREATE POLICY "Technicians can view their assigned appointments" ON public.appointments
  FOR SELECT
  TO authenticated
  USING (assigned_to = (select auth.uid()));

-- =====================================================
-- PLANNING_TECHNICIANS
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
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- CHATBOT_CONVERSATIONS
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
-- USER_LOCATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can delete their own location" ON public.user_locations;
CREATE POLICY "Users can delete their own location" ON public.user_locations
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert their own location" ON public.user_locations;
CREATE POLICY "Users can insert their own location" ON public.user_locations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own location" ON public.user_locations;
CREATE POLICY "Users can update their own location" ON public.user_locations
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));