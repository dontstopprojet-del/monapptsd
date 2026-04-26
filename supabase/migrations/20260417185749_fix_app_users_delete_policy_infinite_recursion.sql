/*
  # Fix infinite recursion in app_users DELETE policy

  1. Problem
    - The DELETE policy on `app_users` contains an inline 
      `EXISTS (SELECT 1 FROM app_users ...)` which queries app_users 
      from within its own RLS policy, causing infinite recursion.

  2. Solution
    - Replace the inline subquery with a call to the existing 
      `is_admin_user()` SECURITY DEFINER function, which bypasses 
      RLS and avoids the recursion.

  3. Security
    - Users can still only delete their own profile
    - Admins can still delete any profile
    - The `is_admin_user()` function is SECURITY DEFINER and safely 
      checks the role without triggering RLS
*/

DROP POLICY IF EXISTS "Users can delete own profile or admins can delete any" ON app_users;

CREATE POLICY "Users can delete own profile or admins can delete any"
  ON app_users
  FOR DELETE
  TO authenticated
  USING (
    id = auth.uid()
    OR is_admin_user()
  );
