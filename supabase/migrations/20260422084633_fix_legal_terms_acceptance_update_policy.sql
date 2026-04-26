/*
  # Fix legal_terms_acceptance UPDATE policy

  1. Changes
    - Replace update policy p3 to include both USING and WITH CHECK
    - This is required for upsert operations to work when a row already exists

  2. Why
    - The upsert on conflict needs WITH CHECK on the UPDATE policy to write new values
    - Without it, the update part of upsert silently fails
*/

DROP POLICY IF EXISTS "p3" ON public.legal_terms_acceptance;

CREATE POLICY "Users can update own legal acceptance"
  ON public.legal_terms_acceptance
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
