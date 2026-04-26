/*
  # Optimize All RLS Policies for Performance - Part 2
  
  ## Tables Covered
  - app_users
  - legal_terms_acceptance  
  - non_compete_signatures
  - daily_notes
  - birthdays
  - incidents
*/

-- =====================================================
-- APP_USERS TABLE
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
-- LEGAL_TERMS_ACCEPTANCE TABLE
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
  USING (user_id = (select auth.uid()));

-- =====================================================
-- NON_COMPETE_SIGNATURES TABLE
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
  USING (user_id = (select auth.uid()));

-- =====================================================
-- DAILY_NOTES TABLE
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
-- BIRTHDAYS TABLE
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
-- INCIDENTS TABLE
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