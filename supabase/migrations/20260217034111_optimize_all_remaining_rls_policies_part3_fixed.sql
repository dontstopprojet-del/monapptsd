/*
  # Optimize All Remaining RLS Policies - Part 3 Fixed
  
  ## Tables Covered
  - admin_settings
  - worksite_completions
  - daily_notes
  - non_compete_signatures
  - incidents
  - birthdays
  - payment_records
*/

-- =====================================================
-- ADMIN_SETTINGS
-- =====================================================

DROP POLICY IF EXISTS "Only admin can delete admin settings" ON public.admin_settings;
CREATE POLICY "Only admin can delete admin settings" ON public.admin_settings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admin can insert admin settings" ON public.admin_settings;
CREATE POLICY "Only admin can insert admin settings" ON public.admin_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Only admin can update admin settings" ON public.admin_settings;
CREATE POLICY "Only admin can update admin settings" ON public.admin_settings
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
-- WORKSITE_COMPLETIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own worksite completions" ON public.worksite_completions;
CREATE POLICY "Users can insert own worksite completions" ON public.worksite_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own worksite completions" ON public.worksite_completions;
CREATE POLICY "Users can read own worksite completions" ON public.worksite_completions
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
-- DAILY_NOTES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own daily notes" ON public.daily_notes;
CREATE POLICY "Users can insert own daily notes" ON public.daily_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can read own daily notes" ON public.daily_notes;
CREATE POLICY "Users can read own daily notes" ON public.daily_notes
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

DROP POLICY IF EXISTS "Users can update own daily notes" ON public.daily_notes;
CREATE POLICY "Users can update own daily notes" ON public.daily_notes
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

-- =====================================================
-- NON_COMPETE_SIGNATURES
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own non-compete signatures" ON public.non_compete_signatures;
CREATE POLICY "Users can insert own non-compete signatures" ON public.non_compete_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own non-compete signatures" ON public.non_compete_signatures;
CREATE POLICY "Users can update own non-compete signatures" ON public.non_compete_signatures
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own non-compete signatures" ON public.non_compete_signatures;
CREATE POLICY "Users can view own non-compete signatures" ON public.non_compete_signatures
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
-- INCIDENTS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own incidents" ON public.incidents;
CREATE POLICY "Users can insert own incidents" ON public.incidents
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own incidents" ON public.incidents;
CREATE POLICY "Users can update own incidents" ON public.incidents
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own incidents" ON public.incidents;
CREATE POLICY "Users can view own incidents" ON public.incidents
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
-- BIRTHDAYS
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own birthdays" ON public.birthdays;
CREATE POLICY "Users can delete own birthdays" ON public.birthdays
  FOR DELETE
  TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own birthdays" ON public.birthdays;
CREATE POLICY "Users can insert own birthdays" ON public.birthdays
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own birthdays" ON public.birthdays;
CREATE POLICY "Users can update own birthdays" ON public.birthdays
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own birthdays" ON public.birthdays;
CREATE POLICY "Users can view own birthdays" ON public.birthdays
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
-- PAYMENT_RECORDS
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