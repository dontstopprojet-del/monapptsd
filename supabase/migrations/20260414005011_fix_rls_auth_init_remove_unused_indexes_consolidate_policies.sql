/*
  # Fix RLS Auth Init Plan, Remove Unused Indexes, Consolidate Duplicate Policies

  1. RLS Auth Init Plan Fixes
    - Replace auth.uid() with (select auth.uid()) in all affected policies
    - This prevents re-evaluation of auth functions per row, improving performance
    - Affected tables: installations_client, historique_interventions_installation,
      conversations, evaluations_techniciens, messages, urgences, chantier_activities,
      tarifs_horaires, call_history, heures_travail, fiches_paie, absences,
      contrats_maintenance, call_signals, visites_contrat

  2. Remove Unused Indexes (24 indexes)
    - These indexes have never been used according to pg_stat_user_indexes
    - Removing them saves storage and improves write performance

  3. Consolidate Duplicate Permissive Policies
    - fiches_paie: Remove old "Admin can ..." policies (superseded by "Admins and office can ...")
    - heures_travail: Remove old "Admin can ..." policies (superseded by "Admins and office can ...")
    - tarifs_horaires: Remove old "Admin can ..." policies (superseded by "Admins and office can ...")

  4. Important Notes
    - All policy changes use DROP then CREATE to ensure clean state
    - Security semantics are preserved exactly
    - Multiple permissive SELECT policies for different roles are intentional (role-based access)
*/

-- ============================================================
-- PART 1: Remove unused indexes
-- ============================================================
DROP INDEX IF EXISTS idx_hist_interv_installation_id;
DROP INDEX IF EXISTS idx_hist_interv_intervention_id;
DROP INDEX IF EXISTS idx_evaluations_intervention_id;
DROP INDEX IF EXISTS idx_urgences_statut;
DROP INDEX IF EXISTS idx_chantier_activities_chantier;
DROP INDEX IF EXISTS idx_chantier_activities_user;
DROP INDEX IF EXISTS idx_chantier_activities_type;
DROP INDEX IF EXISTS idx_chantier_activities_created;
DROP INDEX IF EXISTS idx_call_history_caller;
DROP INDEX IF EXISTS idx_call_history_conversation;
DROP INDEX IF EXISTS idx_call_history_created_at;
DROP INDEX IF EXISTS idx_call_history_is_read;
DROP INDEX IF EXISTS idx_heures_travail_intervention;
DROP INDEX IF EXISTS idx_heures_travail_employe;
DROP INDEX IF EXISTS idx_absences_employe_id;
DROP INDEX IF EXISTS idx_contrats_maintenance_date_fin;
DROP INDEX IF EXISTS idx_fiches_paie_employe;
DROP INDEX IF EXISTS idx_call_signals_conversation;
DROP INDEX IF EXISTS idx_call_signals_caller;
DROP INDEX IF EXISTS idx_call_signals_receiver;
DROP INDEX IF EXISTS idx_call_signals_status;
DROP INDEX IF EXISTS idx_contrats_maintenance_statut;
DROP INDEX IF EXISTS idx_visites_contrat_contrat_id;
DROP INDEX IF EXISTS idx_visites_contrat_statut;

-- ============================================================
-- PART 2: Consolidate duplicate policies on fiches_paie
-- Remove old admin-only policies (superseded by admin+office)
-- ============================================================
DROP POLICY IF EXISTS "Admin can delete payslips" ON public.fiches_paie;
DROP POLICY IF EXISTS "Admin can insert payslips" ON public.fiches_paie;
DROP POLICY IF EXISTS "Admin can read all payslips" ON public.fiches_paie;
DROP POLICY IF EXISTS "Admin can update payslips" ON public.fiches_paie;
DROP POLICY IF EXISTS "Employees can read own payslips" ON public.fiches_paie;

-- Recreate the remaining policies with (select auth.uid()) optimization
DROP POLICY IF EXISTS "Admins and office can select fiches_paie" ON public.fiches_paie;
CREATE POLICY "Admins and office can select fiches_paie"
  ON public.fiches_paie FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
    OR employe_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Admins and office can insert fiches_paie" ON public.fiches_paie;
CREATE POLICY "Admins and office can insert fiches_paie"
  ON public.fiches_paie FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins and office can update fiches_paie" ON public.fiches_paie;
CREATE POLICY "Admins and office can update fiches_paie"
  ON public.fiches_paie FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins and office can delete fiches_paie" ON public.fiches_paie;
CREATE POLICY "Admins and office can delete fiches_paie"
  ON public.fiches_paie FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

-- ============================================================
-- PART 3: Consolidate duplicate policies on heures_travail
-- Remove old admin-only policies (superseded by admin+office)
-- ============================================================
DROP POLICY IF EXISTS "Admin can delete work hours" ON public.heures_travail;
DROP POLICY IF EXISTS "Admin can insert work hours" ON public.heures_travail;
DROP POLICY IF EXISTS "Admin can read all work hours" ON public.heures_travail;
DROP POLICY IF EXISTS "Admin can update work hours" ON public.heures_travail;
DROP POLICY IF EXISTS "Employees can read own work hours" ON public.heures_travail;

DROP POLICY IF EXISTS "Admins and office can select heures_travail" ON public.heures_travail;
CREATE POLICY "Admins and office can select heures_travail"
  ON public.heures_travail FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
    OR employe_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "Admins and office can insert heures_travail" ON public.heures_travail;
CREATE POLICY "Admins and office can insert heures_travail"
  ON public.heures_travail FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins and office can update heures_travail" ON public.heures_travail;
CREATE POLICY "Admins and office can update heures_travail"
  ON public.heures_travail FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins and office can delete heures_travail" ON public.heures_travail;
CREATE POLICY "Admins and office can delete heures_travail"
  ON public.heures_travail FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

-- ============================================================
-- PART 4: Consolidate duplicate policies on tarifs_horaires
-- Remove old admin-only policies (superseded by admin+office)
-- ============================================================
DROP POLICY IF EXISTS "Admin can delete tarifs" ON public.tarifs_horaires;
DROP POLICY IF EXISTS "Admin can insert tarifs" ON public.tarifs_horaires;
DROP POLICY IF EXISTS "Admin can read tarifs" ON public.tarifs_horaires;
DROP POLICY IF EXISTS "Admin can update tarifs" ON public.tarifs_horaires;
DROP POLICY IF EXISTS "Employees can read tarifs" ON public.tarifs_horaires;

DROP POLICY IF EXISTS "Admins and office can manage tarifs_horaires" ON public.tarifs_horaires;
CREATE POLICY "Admins and office can select tarifs_horaires"
  ON public.tarifs_horaires FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office', 'tech')
    )
  );

DROP POLICY IF EXISTS "Admins and office can insert tarifs_horaires" ON public.tarifs_horaires;
CREATE POLICY "Admins and office can insert tarifs_horaires"
  ON public.tarifs_horaires FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins and office can update tarifs_horaires" ON public.tarifs_horaires;
CREATE POLICY "Admins and office can update tarifs_horaires"
  ON public.tarifs_horaires FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admins and office can delete tarifs_horaires" ON public.tarifs_horaires;
CREATE POLICY "Admins and office can delete tarifs_horaires"
  ON public.tarifs_horaires FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

-- ============================================================
-- PART 5: Fix auth init plan on installations_client
-- ============================================================
DROP POLICY IF EXISTS "Admin can manage all installations" ON public.installations_client;
CREATE POLICY "Admin can manage all installations"
  ON public.installations_client FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admin can insert installations" ON public.installations_client;
CREATE POLICY "Admin can insert installations"
  ON public.installations_client FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office', 'tech')
    )
  );

DROP POLICY IF EXISTS "Admin can update installations" ON public.installations_client;
CREATE POLICY "Admin can update installations"
  ON public.installations_client FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office', 'tech')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office', 'tech')
    )
  );

DROP POLICY IF EXISTS "Admin can delete installations" ON public.installations_client;
CREATE POLICY "Admin can delete installations"
  ON public.installations_client FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Clients can view own installations" ON public.installations_client;
CREATE POLICY "Clients can view own installations"
  ON public.installations_client FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Technicians can view client installations" ON public.installations_client;
CREATE POLICY "Technicians can view client installations"
  ON public.installations_client FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'tech'
    )
    AND (
      EXISTS (
        SELECT 1 FROM planning_technicians pt
        JOIN planning p ON pt.planning_id = p.id
        JOIN chantiers c ON p.chantier_id = c.id
        WHERE pt.technician_id = (select auth.uid())
        AND c.client_id = installations_client.client_id
      )
      OR EXISTS (
        SELECT 1 FROM chantiers c
        WHERE c.technician_id = (select auth.uid())
        AND c.client_id = installations_client.client_id
      )
    )
  );

-- ============================================================
-- PART 6: Fix auth init plan on historique_interventions_installation
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all intervention history" ON public.historique_interventions_installation;
CREATE POLICY "Admin can view all intervention history"
  ON public.historique_interventions_installation FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admin can insert intervention history" ON public.historique_interventions_installation;
CREATE POLICY "Admin can insert intervention history"
  ON public.historique_interventions_installation FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office', 'tech')
    )
  );

DROP POLICY IF EXISTS "Admin can update intervention history" ON public.historique_interventions_installation;
CREATE POLICY "Admin can update intervention history"
  ON public.historique_interventions_installation FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office', 'tech')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office', 'tech')
    )
  );

DROP POLICY IF EXISTS "Admin can delete intervention history" ON public.historique_interventions_installation;
CREATE POLICY "Admin can delete intervention history"
  ON public.historique_interventions_installation FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Technicians can view intervention history" ON public.historique_interventions_installation;
CREATE POLICY "Technicians can view intervention history"
  ON public.historique_interventions_installation FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'tech'
    )
    AND (
      technicien_id = (select auth.uid())
      OR EXISTS (
        SELECT 1 FROM installations_client ic
        JOIN chantiers c ON c.client_id = ic.client_id
        WHERE ic.id = historique_interventions_installation.installation_id
        AND (
          c.technician_id = (select auth.uid())
          OR EXISTS (
            SELECT 1 FROM planning_technicians pt
            JOIN planning p ON pt.planning_id = p.id
            WHERE pt.technician_id = (select auth.uid())
            AND p.chantier_id = c.id
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS "Clients can view own intervention history" ON public.historique_interventions_installation;
CREATE POLICY "Clients can view own intervention history"
  ON public.historique_interventions_installation FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM installations_client ic
      WHERE ic.id = historique_interventions_installation.installation_id
      AND ic.client_id = (select auth.uid())
    )
  );

-- ============================================================
-- PART 7: Fix auth init plan on evaluations_techniciens
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all evaluations" ON public.evaluations_techniciens;
CREATE POLICY "Admin can view all evaluations"
  ON public.evaluations_techniciens FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Clients can create evaluations" ON public.evaluations_techniciens;
CREATE POLICY "Clients can create evaluations"
  ON public.evaluations_techniciens FOR INSERT TO authenticated
  WITH CHECK (
    client_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'client'
    )
  );

DROP POLICY IF EXISTS "Clients can view own evaluations" ON public.evaluations_techniciens;
CREATE POLICY "Clients can view own evaluations"
  ON public.evaluations_techniciens FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Technicians can view own evaluations" ON public.evaluations_techniciens;
CREATE POLICY "Technicians can view own evaluations"
  ON public.evaluations_techniciens FOR SELECT TO authenticated
  USING (technicien_id = (select auth.uid()));

DROP POLICY IF EXISTS "Admin can delete evaluations" ON public.evaluations_techniciens;
CREATE POLICY "Admin can delete evaluations"
  ON public.evaluations_techniciens FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'admin'
    )
  );

-- ============================================================
-- PART 8: Fix auth init plan on urgences
-- ============================================================
DROP POLICY IF EXISTS "Admin can view all urgences" ON public.urgences;
CREATE POLICY "Admin can view all urgences"
  ON public.urgences FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admin can update urgences" ON public.urgences;
CREATE POLICY "Admin can update urgences"
  ON public.urgences FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admin can delete urgences" ON public.urgences;
CREATE POLICY "Admin can delete urgences"
  ON public.urgences FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Clients can create urgences" ON public.urgences;
CREATE POLICY "Clients can create urgences"
  ON public.urgences FOR INSERT TO authenticated
  WITH CHECK (
    client_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'client'
    )
  );

DROP POLICY IF EXISTS "Clients can view own urgences" ON public.urgences;
CREATE POLICY "Clients can view own urgences"
  ON public.urgences FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "Technicians can view assigned urgences" ON public.urgences;
CREATE POLICY "Technicians can view assigned urgences"
  ON public.urgences FOR SELECT TO authenticated
  USING (
    technicien_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'tech'
    )
  );

DROP POLICY IF EXISTS "Technicians can update assigned urgences" ON public.urgences;
CREATE POLICY "Technicians can update assigned urgences"
  ON public.urgences FOR UPDATE TO authenticated
  USING (
    technicien_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'tech'
    )
  )
  WITH CHECK (
    technicien_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'tech'
    )
  );

-- ============================================================
-- PART 9: Fix auth init plan on chantier_activities
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can view activities for their chantiers" ON public.chantier_activities;
CREATE POLICY "Authenticated users can view activities for their chantiers"
  ON public.chantier_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chantiers c
      WHERE c.id = chantier_activities.chantier_id
      AND (
        c.client_id = (select auth.uid())
        OR c.technician_id IN (
          SELECT t.id FROM technicians t WHERE t.profile_id = (select auth.uid())
        )
        OR EXISTS (
          SELECT 1 FROM app_users u
          WHERE u.id = (select auth.uid())
          AND u.role IN ('admin', 'office', 'office_employee')
        )
      )
    )
  );

DROP POLICY IF EXISTS "Technicians and admins can create activities" ON public.chantier_activities;
CREATE POLICY "Technicians and admins can create activities"
  ON public.chantier_activities FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can update activities" ON public.chantier_activities;
CREATE POLICY "Admins can update activities"
  ON public.chantier_activities FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users u
      WHERE u.id = (select auth.uid())
      AND u.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users u
      WHERE u.id = (select auth.uid())
      AND u.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete activities" ON public.chantier_activities;
CREATE POLICY "Admins can delete activities"
  ON public.chantier_activities FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users u
      WHERE u.id = (select auth.uid())
      AND u.role = 'admin'
    )
  );

-- ============================================================
-- PART 10: Fix auth init plan on call_history
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own call history" ON public.call_history;
CREATE POLICY "Users can view their own call history"
  ON public.call_history FOR SELECT TO authenticated
  USING ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "Call participants can insert call history" ON public.call_history;
CREATE POLICY "Call participants can insert call history"
  ON public.call_history FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "Call participants can update call history" ON public.call_history;
CREATE POLICY "Call participants can update call history"
  ON public.call_history FOR UPDATE TO authenticated
  USING ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id)
  WITH CHECK ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id);

-- ============================================================
-- PART 11: Fix auth init plan on call_signals
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own calls" ON public.call_signals;
CREATE POLICY "Users can view their own calls"
  ON public.call_signals FOR SELECT TO authenticated
  USING ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "Users can insert call signals" ON public.call_signals;
CREATE POLICY "Users can insert call signals"
  ON public.call_signals FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = caller_id
    AND (
      signal_type NOT IN ('offer', 'video_offer')
      OR ((check_communication_permission(caller_id, receiver_id) ->> 'allowed')::boolean = true)
    )
  );

DROP POLICY IF EXISTS "Call participants can update call signals" ON public.call_signals;
CREATE POLICY "Call participants can update call signals"
  ON public.call_signals FOR UPDATE TO authenticated
  USING ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id)
  WITH CHECK ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id);

DROP POLICY IF EXISTS "Callers can delete their call signals" ON public.call_signals;
CREATE POLICY "Callers can delete their call signals"
  ON public.call_signals FOR DELETE TO authenticated
  USING ((select auth.uid()) = caller_id OR (select auth.uid()) = receiver_id);

-- ============================================================
-- PART 12: Fix auth init plan on conversations
-- ============================================================
DROP POLICY IF EXISTS "Users can create conversations with permission" ON public.conversations;
CREATE POLICY "Users can create conversations with permission"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    ((select auth.uid()) = participant_1_id OR (select auth.uid()) = participant_2_id)
    AND ((check_communication_permission(participant_1_id, participant_2_id) ->> 'allowed')::boolean = true)
  );

-- ============================================================
-- PART 13: Fix auth init plan on messages
-- ============================================================
DROP POLICY IF EXISTS "Users can send messages with permission" ON public.messages;
CREATE POLICY "Users can send messages with permission"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
      AND (c.participant_1_id = (select auth.uid()) OR c.participant_2_id = (select auth.uid()))
    )
  );

-- ============================================================
-- PART 14: Fix auth init plan on absences
-- ============================================================
DROP POLICY IF EXISTS "Admin and office can view all absences" ON public.absences;
CREATE POLICY "Admin and office can view all absences"
  ON public.absences FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admin and office can insert absences" ON public.absences;
CREATE POLICY "Admin and office can insert absences"
  ON public.absences FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admin and office can update absences" ON public.absences;
CREATE POLICY "Admin and office can update absences"
  ON public.absences FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Admin and office can delete absences" ON public.absences;
CREATE POLICY "Admin and office can delete absences"
  ON public.absences FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "Employees can view own absences" ON public.absences;
CREATE POLICY "Employees can view own absences"
  ON public.absences FOR SELECT TO authenticated
  USING (employe_id = (select auth.uid()));

-- ============================================================
-- PART 15: Fix auth init plan on contrats_maintenance
-- ============================================================
DROP POLICY IF EXISTS "admin_office_select_contracts" ON public.contrats_maintenance;
CREATE POLICY "admin_office_select_contracts"
  ON public.contrats_maintenance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "client_select_own_contracts" ON public.contrats_maintenance;
CREATE POLICY "client_select_own_contracts"
  ON public.contrats_maintenance FOR SELECT TO authenticated
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "admin_office_insert_contracts" ON public.contrats_maintenance;
CREATE POLICY "admin_office_insert_contracts"
  ON public.contrats_maintenance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "admin_office_update_contracts" ON public.contrats_maintenance;
CREATE POLICY "admin_office_update_contracts"
  ON public.contrats_maintenance FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "admin_delete_contracts" ON public.contrats_maintenance;
CREATE POLICY "admin_delete_contracts"
  ON public.contrats_maintenance FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'admin'
    )
  );

-- ============================================================
-- PART 16: Fix auth init plan on visites_contrat
-- ============================================================
DROP POLICY IF EXISTS "admin_office_select_visits" ON public.visites_contrat;
CREATE POLICY "admin_office_select_visits"
  ON public.visites_contrat FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "tech_select_own_visits" ON public.visites_contrat;
CREATE POLICY "tech_select_own_visits"
  ON public.visites_contrat FOR SELECT TO authenticated
  USING (technicien_id = (select auth.uid()));

DROP POLICY IF EXISTS "client_select_contract_visits" ON public.visites_contrat;
CREATE POLICY "client_select_contract_visits"
  ON public.visites_contrat FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM contrats_maintenance
      WHERE contrats_maintenance.id = visites_contrat.contrat_id
      AND contrats_maintenance.client_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "admin_office_insert_visits" ON public.visites_contrat;
CREATE POLICY "admin_office_insert_visits"
  ON public.visites_contrat FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "admin_office_update_visits" ON public.visites_contrat;
CREATE POLICY "admin_office_update_visits"
  ON public.visites_contrat FOR UPDATE TO authenticated
  USING (
    technicien_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  )
  WITH CHECK (
    technicien_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role IN ('admin', 'office')
    )
  );

DROP POLICY IF EXISTS "admin_delete_visits" ON public.visites_contrat;
CREATE POLICY "admin_delete_visits"
  ON public.visites_contrat FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = (select auth.uid())
      AND app_users.role = 'admin'
    )
  );
