/*
  # Part 3: Messaging, Voice/Video Calls, Work Tracking

  1. New Tables
    - `conversations` - Chat conversations
    - `messages` - Chat messages with multimedia
    - `call_signals` - WebRTC signaling
    - `call_history` - Call logs
    - `work_sessions` - Work session tracking
    - `work_session_events` - Events within sessions
    - `user_real_time_status` - Real-time user status
    - `work_shifts` - Work shift records
    - `user_locations` - User GPS locations
    - `shared_locations` - Shared location data
*/

-- conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  participant_2_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1_id, participant_2_id)
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant_2_id);

-- messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'invoice')),
  file_url text,
  invoice_id uuid REFERENCES invoices(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);

-- call_signals
CREATE TABLE IF NOT EXISTS call_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  caller_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  signal_type text NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice_candidate', 'call_end', 'call_reject', 'video_offer', 'video_answer')),
  signal_data jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing', 'active', 'ended', 'rejected', 'missed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_signals REPLICA IDENTITY FULL;

CREATE INDEX IF NOT EXISTS idx_call_signals_conversation_id ON call_signals(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_caller_id ON call_signals(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_signals_receiver_id ON call_signals(receiver_id);

-- call_history
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

CREATE INDEX IF NOT EXISTS idx_call_history_caller_id ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver_id ON call_history(receiver_id);

-- work_sessions
CREATE TABLE IF NOT EXISTS work_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE NOT NULL,
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  start_time timestamptz NOT NULL DEFAULT now(),
  end_time timestamptz,
  total_hours decimal(10,2) DEFAULT 0,
  total_kilometers decimal(10,2) DEFAULT 0,
  start_battery integer,
  end_battery integer,
  start_location_lat decimal(10,7),
  start_location_lng decimal(10,7),
  end_location_lat decimal(10,7),
  end_location_lng decimal(10,7),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON work_sessions(user_id);

-- work_session_events
CREATE TABLE IF NOT EXISTS work_session_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES work_sessions(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  event_time timestamptz NOT NULL DEFAULT now(),
  duration_minutes integer,
  location_lat decimal(10,7),
  location_lng decimal(10,7),
  battery_level integer,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_session_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_work_session_events_session_id ON work_session_events(session_id);

-- user_real_time_status
CREATE TABLE IF NOT EXISTS user_real_time_status (
  user_id uuid PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offline',
  current_session_id uuid REFERENCES work_sessions(id) ON DELETE SET NULL,
  current_location_lat decimal(10,7),
  current_location_lng decimal(10,7),
  current_battery integer,
  current_kilometers decimal(10,2) DEFAULT 0,
  current_hours decimal(10,2) DEFAULT 0,
  break_start_time timestamptz,
  break_duration_minutes integer,
  is_on_break boolean DEFAULT false,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE user_real_time_status ENABLE ROW LEVEL SECURITY;

-- work_shifts
CREATE TABLE IF NOT EXISTS work_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  shift_date date,
  start_time timestamptz,
  end_time timestamptz,
  pause_start timestamptz,
  pause_end timestamptz,
  total_km numeric DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE work_shifts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_work_shifts_user_id ON work_shifts(user_id);

-- user_locations
CREATE TABLE IF NOT EXISTS user_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  latitude numeric,
  longitude numeric,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;

-- shared_locations
CREATE TABLE IF NOT EXISTS shared_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  latitude numeric,
  longitude numeric,
  shared_with uuid REFERENCES app_users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shared_locations ENABLE ROW LEVEL SECURITY;
