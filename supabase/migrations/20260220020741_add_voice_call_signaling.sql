/*
  # Voice Call Signaling System

  1. New Tables
    - `call_signals`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `caller_id` (uuid, references app_users)
      - `receiver_id` (uuid, references app_users)
      - `signal_type` (text: offer, answer, ice_candidate, call_end, call_reject)
      - `signal_data` (jsonb, stores SDP/ICE data)
      - `status` (text: ringing, active, ended, rejected, missed)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `call_signals` table
    - Policies for authenticated users who are participants in the call
*/

CREATE TABLE IF NOT EXISTS call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  caller_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice_candidate', 'call_end', 'call_reject')),
  signal_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'rejected', 'missed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_call_signals_conversation ON call_signals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_caller ON call_signals(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_receiver ON call_signals(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_status ON call_signals(status);

CREATE POLICY "Users can view their own calls"
  ON call_signals FOR SELECT
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls they initiate"
  ON call_signals FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Call participants can update call signals"
  ON call_signals FOR UPDATE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Callers can delete their call signals"
  ON call_signals FOR DELETE
  TO authenticated
  USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

ALTER TABLE call_signals REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'call_signals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE call_signals;
  END IF;
END $$;
