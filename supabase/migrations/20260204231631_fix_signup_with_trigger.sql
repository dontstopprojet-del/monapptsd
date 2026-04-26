/*
  # Fix Database Error on User Registration

  1. Problem
    - Users get database errors when signing up
    - Manual insertion after auth.signUp causes timing and permission issues
    - RLS policies may conflict during signup flow

  2. Solution
    - Create automatic trigger to insert into app_users when auth user is created
    - Simplify RLS policies to work with automatic trigger
    - Remove manual insertion code conflicts

  3. Changes
    - Drop conflicting policies
    - Create function to handle new user creation
    - Create trigger on auth.users table
    - Add simplified RLS policies that work with trigger
*/

-- Drop all existing policies that might conflict
DROP POLICY IF EXISTS "Users can insert own profile" ON app_users;
DROP POLICY IF EXISTS "Users can update own profile" ON app_users;
DROP POLICY IF EXISTS "Users can view own profile" ON app_users;
DROP POLICY IF EXISTS "Users can delete own profile" ON app_users;
DROP POLICY IF EXISTS "Admins can view all users" ON app_users;
DROP POLICY IF EXISTS "Anyone can view users" ON app_users;
DROP POLICY IF EXISTS "Anon can insert during signup" ON app_users;
DROP POLICY IF EXISTS "Anon can view for login" ON app_users;

-- Create simplified policies that work with triggers
CREATE POLICY "Enable read for authenticated users"
  ON app_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable read for anon users"
  ON app_users FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON app_users FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable insert for anon users"
  ON app_users FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Enable update for users own profile"
  ON app_users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Enable delete for users own profile"
  ON app_users FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.app_users (id, email, name, role, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'client'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();