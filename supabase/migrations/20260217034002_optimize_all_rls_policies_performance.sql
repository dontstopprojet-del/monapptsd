/*
  # Optimize All RLS Policies for Performance - Part 1
  
  ## Purpose
  Replace auth.uid() with (select auth.uid()) in all RLS policies
  to prevent re-evaluation for each row and improve query performance.
  
  ## Tables Covered (Part 1)
  - chantiers (multiple policies)
  - reviews
  - stocks
  - planning
  - clients
*/

-- =====================================================
-- CHANTIERS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete chantiers" ON public.chantiers;
CREATE POLICY "Admins can delete chantiers" ON public.chantiers
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert chantiers" ON public.chantiers;
CREATE POLICY "Admins can insert chantiers" ON public.chantiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update all chantiers" ON public.chantiers;
CREATE POLICY "Admins can update all chantiers" ON public.chantiers
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

DROP POLICY IF EXISTS "Admins can view all chantiers" ON public.chantiers;
CREATE POLICY "Admins can view all chantiers" ON public.chantiers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can view their chantiers" ON public.chantiers;
CREATE POLICY "Clients can view their chantiers" ON public.chantiers
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

DROP POLICY IF EXISTS "Office can insert chantiers" ON public.chantiers;
CREATE POLICY "Office can insert chantiers" ON public.chantiers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'office'
    )
  );

DROP POLICY IF EXISTS "Office can update all chantiers" ON public.chantiers;
CREATE POLICY "Office can update all chantiers" ON public.chantiers
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'office'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'office'
    )
  );

DROP POLICY IF EXISTS "Office can view all chantiers" ON public.chantiers;
CREATE POLICY "Office can view all chantiers" ON public.chantiers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'office'
    )
  );

DROP POLICY IF EXISTS "Technicians can update assigned chantiers" ON public.chantiers;
CREATE POLICY "Technicians can update assigned chantiers" ON public.chantiers
  FOR UPDATE
  TO authenticated
  USING (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Technicians can view assigned chantiers" ON public.chantiers;
CREATE POLICY "Technicians can view assigned chantiers" ON public.chantiers
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
-- REVIEWS TABLE
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
      AND role IN ('admin', 'office')
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
-- STOCKS TABLE
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage stocks" ON public.stocks;
CREATE POLICY "Admins can manage stocks" ON public.stocks
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

-- =====================================================
-- PLANNING TABLE
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
-- CLIENTS TABLE
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