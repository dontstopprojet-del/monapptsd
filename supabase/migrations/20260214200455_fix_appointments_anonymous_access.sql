/*
  # Fix Appointments - Allow Anonymous Access

  1. Changes
    - Add policy to allow anonymous users (visitors) to create appointments
    - This allows visitors to book appointments without needing an account
    - Maintains security by only allowing INSERT operations for anonymous users
  
  2. Security
    - Anonymous users can only INSERT appointments (not view, update, or delete)
    - Authenticated users maintain their existing permissions
    - Admin users can still manage all appointments
*/

-- Drop the existing restrictive policy for clients
DROP POLICY IF EXISTS "Clients can create their own appointments" ON appointments;

-- Create new policy for authenticated users to create their own appointments
CREATE POLICY "Authenticated users can create their own appointments"
  ON appointments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create new policy for anonymous users to create appointments
CREATE POLICY "Anonymous users can create appointments"
  ON appointments
  FOR INSERT
  TO anon
  WITH CHECK (true);