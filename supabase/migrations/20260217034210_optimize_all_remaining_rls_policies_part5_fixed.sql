/*
  # Optimize All Remaining RLS Policies - Part 5 Fixed
  
  ## Tables Covered
  - chantiers (all policies)
*/

-- =====================================================
-- CHANTIERS
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
      AND role = 'client'
      AND id = chantiers.client_id
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
      SELECT 1 FROM public.planning_technicians pt
      JOIN public.planning p ON p.id = pt.planning_id
      WHERE p.chantier_id = chantiers.id
      AND pt.technician_id = (select auth.uid())
    )
  )
  WITH CHECK (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.planning_technicians pt
      JOIN public.planning p ON p.id = pt.planning_id
      WHERE p.chantier_id = chantiers.id
      AND pt.technician_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Technicians can view assigned chantiers" ON public.chantiers;
CREATE POLICY "Technicians can view assigned chantiers" ON public.chantiers
  FOR SELECT
  TO authenticated
  USING (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.planning_technicians pt
      JOIN public.planning p ON p.id = pt.planning_id
      WHERE p.chantier_id = chantiers.id
      AND pt.technician_id = (select auth.uid())
    )
  );