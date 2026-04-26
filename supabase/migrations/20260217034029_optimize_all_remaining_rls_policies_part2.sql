/*
  # Optimize All Remaining RLS Policies - Part 2
  
  ## Tables Covered
  - notifications
  - reports
  - notification_settings
  - invoices
  - quotes
  - projects
*/

-- =====================================================
-- NOTIFICATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own notifications" ON public.notifications;
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "users_view_own_notifications" ON public.notifications;
CREATE POLICY "users_view_own_notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- REPORTS
-- =====================================================

DROP POLICY IF EXISTS "Admin can delete reports" ON public.reports;
CREATE POLICY "Admin can delete reports" ON public.reports
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
CREATE POLICY "Admins can manage reports" ON public.reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Office and admin can create reports" ON public.reports;
CREATE POLICY "Office and admin can create reports" ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Office and admin can update reports" ON public.reports;
CREATE POLICY "Office and admin can update reports" ON public.reports
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

DROP POLICY IF EXISTS "Office and admin can view reports" ON public.reports;
CREATE POLICY "Office and admin can view reports" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- NOTIFICATION_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own notification settings" ON public.notification_settings;
CREATE POLICY "Users can insert own notification settings" ON public.notification_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification settings" ON public.notification_settings;
CREATE POLICY "Users can update own notification settings" ON public.notification_settings
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own notification settings" ON public.notification_settings;
CREATE POLICY "Users can view own notification settings" ON public.notification_settings
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

-- =====================================================
-- INVOICES
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete invoices" ON public.invoices;
CREATE POLICY "Admins can delete invoices" ON public.invoices
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins can insert invoices" ON public.invoices;
CREATE POLICY "Admins can insert invoices" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins can update invoices" ON public.invoices;
CREATE POLICY "Admins can update invoices" ON public.invoices
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

DROP POLICY IF EXISTS "Users can view invoices" ON public.invoices;
CREATE POLICY "Users can view invoices" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    client_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- QUOTES
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage quotes" ON public.quotes;
CREATE POLICY "Admins can manage quotes" ON public.quotes
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
-- PROJECTS
-- =====================================================

DROP POLICY IF EXISTS "Allow admin to delete projects" ON public.projects;
CREATE POLICY "Allow admin to delete projects" ON public.projects
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Allow office and admin to insert projects" ON public.projects;
CREATE POLICY "Allow office and admin to insert projects" ON public.projects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Allow office and admin to update projects" ON public.projects;
CREATE POLICY "Allow office and admin to update projects" ON public.projects
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