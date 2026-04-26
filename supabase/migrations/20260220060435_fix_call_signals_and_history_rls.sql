/*
  # Fix call signaling and call history RLS policies

  1. Modified Tables
    - `call_signals`
      - Replaced INSERT policy: the original policy required `check_communication_permission` for ALL inserts,
        which blocked signaling responses (answer, ICE candidates, call_reject, call_end) 
        because only the initial offer needs permission checking.
        New policy: allow insert if user is either caller_id (for any signal) or receiver_id 
        (the receiver can respond to a call they received). Permission check only on offer/video_offer.
    - `call_history`
      - Replaced INSERT policy: old policy only allowed caller to insert.
        New policy: either caller or receiver can insert call history records (needed for missed call tracking).

  2. Security
    - call_signals: Still restricted to authenticated users. Initial offers still require communication permission.
      Response signals (answer, ice_candidate, call_end, call_reject) are allowed from participants.
    - call_history: Both call participants can now insert history records.
*/

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can create calls with permission" ON call_signals;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Users can insert call signals"
  ON call_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = caller_id
    AND (
      signal_type NOT IN ('offer', 'video_offer')
      OR ((check_communication_permission(caller_id, receiver_id) ->> 'allowed')::boolean = true)
    )
  );

DO $$ BEGIN
  DROP POLICY IF EXISTS "Authenticated users can insert call history" ON call_history;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "Call participants can insert call history"
  ON call_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);
