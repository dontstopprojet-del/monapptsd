/*
  # Communication Permissions & Call History System

  1. New Tables
    - `call_history`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `caller_id` (uuid, references app_users)
      - `receiver_id` (uuid, references app_users)
      - `call_type` (text: 'voice', 'video')
      - `status` (text: 'completed', 'missed', 'rejected', 'failed')
      - `is_urgent` (boolean, default false)
      - `duration_seconds` (integer, default 0)
      - `started_at` (timestamptz)
      - `ended_at` (timestamptz)
      - `created_at` (timestamptz)

  2. New Functions
    - `check_communication_permission(sender_id, receiver_id)` - Server-side function that validates
      whether a user can communicate with another based on role-based rules:
        - Client -> Client: BLOCKED
        - Client -> Tech: Only if tech is assigned to client's chantier
        - Client -> Office: ALLOWED
        - Client -> Admin: ALLOWED (urgent only enforced on frontend)
        - Tech -> Client: Only if client is on tech's chantier
        - Tech -> Tech: ALLOWED
        - Tech -> Office: ALLOWED
        - Tech -> Admin: ALLOWED (urgent only enforced on frontend)
        - Office -> Tech: ALLOWED
        - Office -> Office: ALLOWED
        - Office -> Admin: ALLOWED
        - Admin -> All: ALLOWED
    - `get_allowed_contacts(user_id)` - Returns list of users the given user can communicate with

  3. Modified Tables
    - `call_signals` - Updated CHECK constraint to include 'video_offer' and 'video_answer' signal types
    - `conversations` - New RLS policies enforcing communication permissions on INSERT

  4. Security
    - RLS enabled on `call_history`
    - Communication permission check enforced at database level
    - Call history only visible to participants

  5. Important Notes
    - The permission function uses SECURITY DEFINER to access all tables
    - Chantier-based permissions check both `chantiers.client_id` and `chantiers.technician_id`
    - Also checks `planning_technicians` for multi-technician assignments
*/

-- 1. Update call_signals signal_type constraint to include video types
ALTER TABLE call_signals DROP CONSTRAINT IF EXISTS call_signals_signal_type_check;
ALTER TABLE call_signals ADD CONSTRAINT call_signals_signal_type_check 
  CHECK (signal_type IN ('offer', 'answer', 'ice_candidate', 'call_end', 'call_reject', 'video_offer', 'video_answer'));

-- 2. Create call_history table
CREATE TABLE IF NOT EXISTS call_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  caller_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  call_type text NOT NULL DEFAULT 'voice' CHECK (call_type IN ('voice', 'video')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'missed', 'rejected', 'failed')),
  is_urgent boolean NOT NULL DEFAULT false,
  duration_seconds integer NOT NULL DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_call_history_caller ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver ON call_history(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_history_conversation ON call_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_history_created_at ON call_history(created_at DESC);

CREATE POLICY "Users can view their own call history"
  ON call_history FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Authenticated users can insert call history"
  ON call_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Call participants can update call history"
  ON call_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- 3. Create communication permission check function
CREATE OR REPLACE FUNCTION check_communication_permission(
  p_sender_id uuid,
  p_receiver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_role text;
  v_receiver_role text;
  v_has_shared_chantier boolean := false;
BEGIN
  SELECT role INTO v_sender_role FROM app_users WHERE id = p_sender_id;
  SELECT role INTO v_receiver_role FROM app_users WHERE id = p_receiver_id;

  IF v_sender_role IS NULL OR v_receiver_role IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'user_not_found');
  END IF;

  IF v_sender_role = 'admin' THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'admin_access');
  END IF;

  IF v_sender_role = 'office' THEN
    IF v_receiver_role IN ('tech', 'office', 'admin') THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'office_access');
    END IF;
    RETURN jsonb_build_object('allowed', false, 'reason', 'office_cannot_contact_clients');
  END IF;

  IF v_sender_role = 'tech' THEN
    IF v_receiver_role = 'tech' THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'tech_to_tech');
    END IF;
    IF v_receiver_role = 'office' THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'tech_to_office');
    END IF;
    IF v_receiver_role = 'admin' THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'tech_to_admin');
    END IF;
    IF v_receiver_role = 'client' THEN
      SELECT EXISTS (
        SELECT 1 FROM chantiers
        WHERE client_id = p_receiver_id
        AND (
          technician_id = p_sender_id
          OR EXISTS (
            SELECT 1 FROM planning_technicians pt
            JOIN chantiers c2 ON c2.id = pt.planning_id
            WHERE c2.client_id = p_receiver_id
            AND pt.technician_id = p_sender_id
          )
        )
      ) INTO v_has_shared_chantier;

      IF v_has_shared_chantier THEN
        RETURN jsonb_build_object('allowed', true, 'reason', 'tech_assigned_to_client_chantier');
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'tech_not_assigned_to_client');
    END IF;
  END IF;

  IF v_sender_role = 'client' THEN
    IF v_receiver_role = 'client' THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'client_to_client_blocked');
    END IF;
    IF v_receiver_role = 'office' THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'client_to_office');
    END IF;
    IF v_receiver_role = 'admin' THEN
      RETURN jsonb_build_object('allowed', true, 'reason', 'client_to_admin');
    END IF;
    IF v_receiver_role = 'tech' THEN
      SELECT EXISTS (
        SELECT 1 FROM chantiers
        WHERE client_id = p_sender_id
        AND (
          technician_id = p_receiver_id
          OR EXISTS (
            SELECT 1 FROM planning_technicians pt
            JOIN chantiers c2 ON c2.id = pt.planning_id
            WHERE c2.client_id = p_sender_id
            AND pt.technician_id = p_receiver_id
          )
        )
      ) INTO v_has_shared_chantier;

      IF v_has_shared_chantier THEN
        RETURN jsonb_build_object('allowed', true, 'reason', 'client_tech_assigned');
      END IF;
      RETURN jsonb_build_object('allowed', false, 'reason', 'tech_not_assigned_to_client');
    END IF;
  END IF;

  RETURN jsonb_build_object('allowed', false, 'reason', 'unknown_role_combination');
END;
$$;

-- 4. Create get_allowed_contacts function
CREATE OR REPLACE FUNCTION get_allowed_contacts(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  phone text,
  role text,
  profile_photo text,
  office_position text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_role text;
BEGIN
  SELECT au.role INTO v_user_role FROM app_users au WHERE au.id = p_user_id;

  IF v_user_role = 'admin' THEN
    RETURN QUERY
      SELECT au.id, au.name, au.email, au.phone, au.role, au.profile_photo, au.office_position
      FROM app_users au
      WHERE au.id != p_user_id
      ORDER BY au.name;
    RETURN;
  END IF;

  IF v_user_role = 'office' THEN
    RETURN QUERY
      SELECT au.id, au.name, au.email, au.phone, au.role, au.profile_photo, au.office_position
      FROM app_users au
      WHERE au.id != p_user_id
        AND au.role IN ('tech', 'office', 'admin')
      ORDER BY au.name;
    RETURN;
  END IF;

  IF v_user_role = 'tech' THEN
    RETURN QUERY
      SELECT DISTINCT au.id, au.name, au.email, au.phone, au.role, au.profile_photo, au.office_position
      FROM app_users au
      WHERE au.id != p_user_id
        AND (
          au.role IN ('tech', 'office', 'admin')
          OR (
            au.role = 'client'
            AND EXISTS (
              SELECT 1 FROM chantiers c
              WHERE c.client_id = au.id
              AND (
                c.technician_id = p_user_id
                OR EXISTS (
                  SELECT 1 FROM planning_technicians pt
                  JOIN chantiers c2 ON c2.id = pt.planning_id
                  WHERE c2.client_id = au.id
                  AND pt.technician_id = p_user_id
                )
              )
            )
          )
        )
      ORDER BY au.name;
    RETURN;
  END IF;

  IF v_user_role = 'client' THEN
    RETURN QUERY
      SELECT DISTINCT au.id, au.name, au.email, au.phone, au.role, au.profile_photo, au.office_position
      FROM app_users au
      WHERE au.id != p_user_id
        AND (
          au.role IN ('office', 'admin')
          OR (
            au.role = 'tech'
            AND EXISTS (
              SELECT 1 FROM chantiers c
              WHERE c.client_id = p_user_id
              AND (
                c.technician_id = au.id
                OR EXISTS (
                  SELECT 1 FROM planning_technicians pt
                  JOIN chantiers c2 ON c2.id = pt.planning_id
                  WHERE c2.client_id = p_user_id
                  AND pt.technician_id = au.id
                )
              )
            )
          )
        )
      ORDER BY au.name;
    RETURN;
  END IF;

  RETURN;
END;
$$;

-- 5. Add RLS policy on conversations to enforce permission on creation
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations with permission"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (participant_1_id, participant_2_id)
    AND (
      (check_communication_permission(participant_1_id, participant_2_id)->>'allowed')::boolean = true
    )
  );

-- 6. Add RLS policy on call_signals to enforce permission
DROP POLICY IF EXISTS "Users can create calls they initiate" ON call_signals;
CREATE POLICY "Users can create calls with permission"
  ON call_signals FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = caller_id
    AND (
      (check_communication_permission(caller_id, receiver_id)->>'allowed')::boolean = true
    )
  );

-- 7. Add RLS policy on messages to enforce permission on send
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
CREATE POLICY "Users can send messages with permission"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
    )
  );

-- 8. Add call_history to realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'call_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_history;
  END IF;
END $$;
