/*
  # Fix app_users DELETE policy to allow admin deletion

  ## Problem
  The existing DELETE policy on app_users only allows users to delete their own
  account (id = auth.uid()). This means admins cannot delete other users' accounts —
  the query silently succeeds but removes 0 rows because RLS blocks it.

  ## Fix
  Replace the restrictive delete policy with one that allows:
  - Users to delete their own profile
  - Admins to delete any profile

  ## Security
  Only users with role = 'admin' can delete other accounts.
  Regular users can still only delete their own.
*/

DROP POLICY IF EXISTS "Authenticated users can delete own profile" ON app_users;

CREATE POLICY "Users can delete own profile or admins can delete any"
  ON app_users FOR DELETE
  TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM app_users admins
      WHERE admins.id = (SELECT auth.uid())
        AND admins.role = 'admin'
    )
  );
