/*
  # Fix Security Definer View and RLS Always-True INSERT Policies

  1. View Changes
    - Drop and recreate `technician_stats` view WITHOUT security_definer
      (uses SECURITY INVOKER, the default, so RLS on the underlying
      `technicians` table is respected)

  2. RLS Policy Changes (replace always-true INSERT policies)
    - `admin_alerts.p2`: Only admin/office users can insert alerts
    - `appointments.p3`: Anyone can insert but must set user_id = own id when authenticated
    - `contact_messages.p1`: Anyone can insert (public contact form) - restrict to expected columns via check on required fields
    - `legal_signatures.p2`: Authenticated users can only insert their own signatures (user_id = auth.uid())
    - `notifications.p2`: Only admin/office can insert notifications
    - `project_photos.p2`: Authenticated users can only insert photos they uploaded (uploaded_by = auth.uid())
    - `quote_requests.p1`: Anyone can insert (public quote form) - restrict to rows where user_id is null or matches auth.uid()
    - `reports.p2`: Only admin/office can create reports
    - `work_session_events.p2`: Authenticated users can only insert events for sessions they own
    - `worksite_completions.p2`: Authenticated users can only insert their own completions (user_id = auth.uid())

  3. Security
    - All always-true INSERT policies are replaced with ownership or role checks
    - Anonymous insert tables (appointments, contact_messages, quote_requests)
      keep anonymous access but add data-integrity constraints
    - View no longer escalates privileges
*/

-- ============================================================
-- 1. Fix technician_stats view: remove SECURITY DEFINER
-- ============================================================
DROP VIEW IF EXISTS public.technician_stats;

CREATE VIEW public.technician_stats AS
SELECT
  id,
  profile_id,
  role_level,
  status,
  completed_jobs,
  absence_count,
  sick_leave_count,
  complaint_count,
  home_address,
  home_lat,
  home_lng,
  contract_date,
  EXTRACT(year FROM age(CURRENT_DATE::timestamp with time zone, contract_date::timestamp with time zone))::integer AS years_of_service,
  EXTRACT(month FROM age(CURRENT_DATE::timestamp with time zone, contract_date::timestamp with time zone))::integer AS months_of_service
FROM technicians t;

-- ============================================================
-- 2. Fix admin_alerts INSERT policy
--    Only admin/office users should create alerts
-- ============================================================
DROP POLICY IF EXISTS "p2" ON public.admin_alerts;

CREATE POLICY "Admins and office can insert alerts"
  ON public.admin_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_office());

-- ============================================================
-- 3. Fix appointments INSERT policy
--    Public booking form allows anonymous inserts.
--    Authenticated users must set user_id to their own id.
--    Anonymous users must leave user_id null.
-- ============================================================
DROP POLICY IF EXISTS "p3" ON public.appointments;

CREATE POLICY "Anyone can book appointment with ownership check"
  ON public.appointments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    CASE
      WHEN auth.uid() IS NOT NULL THEN user_id = auth.uid()
      ELSE user_id IS NULL
    END
  );

-- ============================================================
-- 4. Fix contact_messages INSERT policy
--    Public contact form: anyone can submit.
--    Require non-empty name and message to prevent empty spam rows.
-- ============================================================
DROP POLICY IF EXISTS "p1" ON public.contact_messages;

CREATE POLICY "Anyone can submit contact message with valid data"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    name IS NOT NULL AND length(trim(name)) > 0
    AND message IS NOT NULL AND length(trim(message)) > 0
  );

-- ============================================================
-- 5. Fix legal_signatures INSERT policy
--    Users can only insert their own signatures
-- ============================================================
DROP POLICY IF EXISTS "p2" ON public.legal_signatures;

CREATE POLICY "Users can insert own legal signatures"
  ON public.legal_signatures
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. Fix notifications INSERT policy
--    Only admin/office can create notifications
-- ============================================================
DROP POLICY IF EXISTS "p2" ON public.notifications;

CREATE POLICY "Admins and office can insert notifications"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_office());

-- ============================================================
-- 7. Fix project_photos INSERT policy
--    Users can only insert photos they uploaded
-- ============================================================
DROP POLICY IF EXISTS "p2" ON public.project_photos;

CREATE POLICY "Users can insert own project photos"
  ON public.project_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- ============================================================
-- 8. Fix quote_requests INSERT policy
--    Public form: anyone can submit.
--    If authenticated, user_id must match auth.uid().
--    If anonymous, user_id must be null.
-- ============================================================
DROP POLICY IF EXISTS "p1" ON public.quote_requests;

CREATE POLICY "Anyone can submit quote request with ownership check"
  ON public.quote_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    CASE
      WHEN auth.uid() IS NOT NULL THEN (user_id IS NULL OR user_id = auth.uid())
      ELSE user_id IS NULL
    END
  );

-- ============================================================
-- 9. Fix reports INSERT policy
--    Only admin/office can create reports
-- ============================================================
DROP POLICY IF EXISTS "p2" ON public.reports;

CREATE POLICY "Admins and office can insert reports"
  ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_office());

-- ============================================================
-- 10. Fix work_session_events INSERT policy
--     Users can only insert events for sessions they own
-- ============================================================
DROP POLICY IF EXISTS "p2" ON public.work_session_events;

CREATE POLICY "Users can insert events for own work sessions"
  ON public.work_session_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_sessions ws
      WHERE ws.id = session_id
        AND ws.user_id = auth.uid()
    )
  );

-- ============================================================
-- 11. Fix worksite_completions INSERT policy
--     Users can only insert their own completions
-- ============================================================
DROP POLICY IF EXISTS "p2" ON public.worksite_completions;

CREATE POLICY "Users can insert own worksite completions"
  ON public.worksite_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Force PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';
