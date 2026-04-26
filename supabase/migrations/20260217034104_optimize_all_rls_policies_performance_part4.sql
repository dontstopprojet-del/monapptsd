/*
  # Optimize All RLS Policies for Performance - Part 4
  
  ## Tables Covered
  - invoices
  - quotes
  - quote_requests
  - user_locations
  - stock_items
  - stock_movements
*/

-- =====================================================
-- INVOICES TABLE
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
-- QUOTES TABLE
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
-- QUOTE_REQUESTS TABLE
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
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "auth_update_own_quotes" ON public.quote_requests;
CREATE POLICY "auth_update_own_quotes" ON public.quote_requests
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- USER_LOCATIONS TABLE
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

-- =====================================================
-- STOCK_ITEMS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can create stock items" ON public.stock_items;
CREATE POLICY "Admins can create stock items" ON public.stock_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
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
      AND role = 'admin'
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

-- =====================================================
-- STOCK_MOVEMENTS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete stock movements" ON public.stock_movements;
CREATE POLICY "Admins can delete stock movements" ON public.stock_movements
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
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

DROP POLICY IF EXISTS "Authenticated users can create stock movements" ON public.stock_movements;
CREATE POLICY "Authenticated users can create stock movements" ON public.stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'tech')
    )
  );