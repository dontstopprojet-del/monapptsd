/*
  # Fix call_signals signal_type constraint for video calls

  1. Modified Tables
    - `call_signals`
      - Updated CHECK constraint on `signal_type` to also allow 'video_offer' and 'video_answer'
      - These types are used by the VideoCall component but were being rejected by the database

  2. Important Notes
    - This was causing video calls to fail silently after acceptance because the answer signal
      could not be inserted into the database
    - Voice calls using 'offer' and 'answer' types continue to work as before
*/

ALTER TABLE call_signals DROP CONSTRAINT IF EXISTS call_signals_signal_type_check;

ALTER TABLE call_signals ADD CONSTRAINT call_signals_signal_type_check
  CHECK (signal_type IN ('offer', 'answer', 'ice_candidate', 'call_end', 'call_reject', 'video_offer', 'video_answer'));
