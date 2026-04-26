/*
  # Optimize Final RLS Policies
  
  ## Tables Covered
  - profiles
  - technicians
  - mission_trips
  - work_shifts (already done earlier but ensuring completeness)
*/

-- =====================================================
-- PROFILES
-- =====================================================

DROP POLICY IF EXISTS "Users and admins can view profiles" ON public.profiles;
CREATE POLICY "Users and admins can view profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

-- =====================================================
-- TECHNICIANS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete technicians" ON public.technicians;
CREATE POLICY "Admins can delete technicians" ON public.technicians
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can insert technicians" ON public.technicians;
CREATE POLICY "Admins can insert technicians" ON public.technicians
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Techs and admins can update technicians" ON public.technicians;
CREATE POLICY "Techs and admins can update technicians" ON public.technicians
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

-- =====================================================
-- MISSION_TRIPS
-- =====================================================

DROP POLICY IF EXISTS "Techs can insert own mission trips" ON public.mission_trips;
CREATE POLICY "Techs can insert own mission trips" ON public.mission_trips
  FOR INSERT
  TO authenticated
  WITH CHECK (
    technician_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Techs can update own mission trips" ON public.mission_trips;
CREATE POLICY "Techs can update own mission trips" ON public.mission_trips
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

DROP POLICY IF EXISTS "Techs can view own mission trips" ON public.mission_trips;
CREATE POLICY "Techs can view own mission trips" ON public.mission_trips
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
-- WORK_SHIFTS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own work shifts" ON public.work_shifts;
CREATE POLICY "Users can insert own work shifts" ON public.work_shifts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own work shifts" ON public.work_shifts;
CREATE POLICY "Users can update own work shifts" ON public.work_shifts
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own work shifts" ON public.work_shifts;
CREATE POLICY "Users can view own work shifts" ON public.work_shifts
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