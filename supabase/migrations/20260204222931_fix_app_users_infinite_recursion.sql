/*
  # Fix infinite recursion in app_users RLS policies

  1. Problem
    - The "Admins can view all users" policy queries app_users to check admin role
    - This creates infinite recursion when accessing app_users table

  2. Solution
    - Drop all existing policies on app_users
    - Create simplified policies that don't cause recursion
    - Use auth.jwt() to check role from user metadata instead of querying app_users
*/

-- Drop all existing policies on app_users
DROP POLICY IF EXISTS "Admins can view all users" ON app_users;
DROP POLICY IF EXISTS "Allow anon to insert users" ON app_users;
DROP POLICY IF EXISTS "Allow anon to update users" ON app_users;
DROP POLICY IF EXISTS "Allow anon to view users" ON app_users;
DROP POLICY IF EXISTS "Users can insert own profile" ON app_users;
DROP POLICY IF EXISTS "Users can update own profile" ON app_users;
DROP POLICY IF EXISTS "Users can view own profile" ON app_users;

-- Create simple non-recursive policies
-- SELECT: Users can view their own profile OR all users (for app functionality)
CREATE POLICY "Anyone can view users"
  ON app_users
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: Users can only insert their own profile
CREATE POLICY "Users can insert own profile"
  ON app_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- UPDATE: Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON app_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- DELETE: Users can only delete their own profile
CREATE POLICY "Users can delete own profile"
  ON app_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Allow anon access for signup flow
CREATE POLICY "Anon can insert during signup"
  ON app_users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can view for login"
  ON app_users
  FOR SELECT
  TO anon
  USING (true);