/*
  # Optimize Final Remaining RLS Policies - Fixed V2
  
  ## Purpose
  Optimize the last remaining RLS policies by wrapping auth.uid() in SELECT statements.
  This prevents re-evaluation for each row and improves query performance.
  
  ## Tables Covered
  - admin_alerts
  - conversations
  - messages
  - expenses
  - work_sessions
  - work_session_events
  - user_real_time_status
  - contact_messages
*/

-- =====================================================
-- ADMIN_ALERTS
-- =====================================================

DROP POLICY IF EXISTS "Users can read own alerts" ON public.admin_alerts;
CREATE POLICY "Users can read own alerts" ON public.admin_alerts
  FOR SELECT
  TO authenticated
  USING (
    recipient_id = (select auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Users can update own alerts read status" ON public.admin_alerts;
CREATE POLICY "Users can update own alerts read status" ON public.admin_alerts
  FOR UPDATE
  TO authenticated
  USING (recipient_id = (select auth.uid()))
  WITH CHECK (recipient_id = (select auth.uid()));

-- =====================================================
-- CONVERSATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_1_id = (select auth.uid()) OR 
    participant_2_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    participant_1_id = (select auth.uid()) OR 
    participant_2_id = (select auth.uid())
  )
  WITH CHECK (
    participant_1_id = (select auth.uid()) OR 
    participant_2_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    participant_1_id = (select auth.uid()) OR 
    participant_2_id = (select auth.uid())
  );

-- =====================================================
-- MESSAGES
-- =====================================================

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (select auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
      AND (participant_1_id = (select auth.uid()) OR participant_2_id = (select auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (sender_id = (select auth.uid()))
  WITH CHECK (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE id = messages.conversation_id
      AND (participant_1_id = (select auth.uid()) OR participant_2_id = (select auth.uid()))
    )
  );

-- =====================================================
-- EXPENSES
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete expenses" ON public.expenses;
CREATE POLICY "Admins can delete expenses" ON public.expenses
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins can update all expenses" ON public.expenses;
CREATE POLICY "Admins can update all expenses" ON public.expenses
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

DROP POLICY IF EXISTS "Admins can view all expenses" ON public.expenses;
CREATE POLICY "Admins can view all expenses" ON public.expenses
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Technicians can create own expenses" ON public.expenses;
CREATE POLICY "Technicians can create own expenses" ON public.expenses
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

DROP POLICY IF EXISTS "Technicians can update pending expenses" ON public.expenses;
CREATE POLICY "Technicians can update pending expenses" ON public.expenses
  FOR UPDATE
  TO authenticated
  USING (
    technician_id = (select auth.uid()) AND status = 'pending'
  )
  WITH CHECK (
    technician_id = (select auth.uid()) AND status = 'pending'
  );

DROP POLICY IF EXISTS "Technicians can view own expenses" ON public.expenses;
CREATE POLICY "Technicians can view own expenses" ON public.expenses
  FOR SELECT
  TO authenticated
  USING (technician_id = (select auth.uid()));

-- =====================================================
-- WORK_SESSIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can create their own work sessions" ON public.work_sessions;
CREATE POLICY "Users can create their own work sessions" ON public.work_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own work sessions" ON public.work_sessions;
CREATE POLICY "Users can update their own work sessions" ON public.work_sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own work sessions" ON public.work_sessions;
CREATE POLICY "Users can view their own work sessions" ON public.work_sessions
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
-- WORK_SESSION_EVENTS
-- =====================================================

DROP POLICY IF EXISTS "Users can create events for their sessions" ON public.work_session_events;
CREATE POLICY "Users can create events for their sessions" ON public.work_session_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_sessions
      WHERE id = work_session_events.session_id
      AND user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view events from their sessions" ON public.work_session_events;
CREATE POLICY "Users can view events from their sessions" ON public.work_session_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_sessions
      WHERE id = work_session_events.session_id
      AND (
        user_id = (select auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.app_users
          WHERE id = (select auth.uid())
          AND role IN ('admin', 'office')
        )
      )
    )
  );

-- =====================================================
-- USER_REAL_TIME_STATUS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert their own status" ON public.user_real_time_status;
CREATE POLICY "Users can insert their own status" ON public.user_real_time_status
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update their own status" ON public.user_real_time_status;
CREATE POLICY "Users can update their own status" ON public.user_real_time_status
  FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view their own status" ON public.user_real_time_status;
CREATE POLICY "Users can view their own status" ON public.user_real_time_status
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
-- CONTACT_MESSAGES
-- =====================================================

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages" ON public.contact_messages
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

DROP POLICY IF EXISTS "Admins can view contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view contact messages" ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'office')
    )
  );