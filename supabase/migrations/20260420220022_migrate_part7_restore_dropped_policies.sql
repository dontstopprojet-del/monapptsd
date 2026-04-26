/*
  # Part 7: Restore RLS policies dropped by CASCADE
  
  Restoring policies for call_signals INSERT and conversations INSERT
  that were dropped when we dropped check_communication_permission CASCADE
*/

-- Restore call signals insert policy
CREATE POLICY "Users can insert call signals"
  ON call_signals FOR INSERT TO authenticated
  WITH CHECK (
    caller_id = (select auth.uid())
    AND check_communication_permission((select auth.uid()), receiver_id)
  );

-- Restore conversations create policy
CREATE POLICY "Users can create conversations with permission"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (
    (participant_1_id = (select auth.uid()) OR participant_2_id = (select auth.uid()))
    AND check_communication_permission(participant_1_id, participant_2_id)
  );
