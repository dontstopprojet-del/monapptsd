/*
  # Create Chatbot Conversations History Table

  1. New Tables
    - `chatbot_conversations`
      - `id` (uuid, primary key) - Unique conversation ID
      - `user_id` (uuid, nullable) - User who sent the message (null for anonymous)
      - `user_message` (text) - User's message content
      - `bot_response` (text) - Bot's response content
      - `language` (text) - Language used (fr, en, ar)
      - `category` (text, nullable) - Response category
      - `created_at` (timestamptz) - Timestamp of conversation

  2. Security
    - Enable RLS on `chatbot_conversations` table
    - Add policy for users to view their own conversations
    - Add policy for authenticated users to create conversations
    - Add policy for anonymous users to create conversations (without user_id)

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on created_at for sorting
*/

CREATE TABLE IF NOT EXISTS chatbot_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message text NOT NULL,
  bot_response text NOT NULL,
  language text DEFAULT 'fr',
  category text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chatbot_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chatbot conversations"
  ON chatbot_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own chatbot conversations"
  ON chatbot_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anonymous can create chatbot conversations"
  ON chatbot_conversations
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON chatbot_conversations(created_at DESC);
