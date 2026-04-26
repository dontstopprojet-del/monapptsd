/*
  # Fix legal_terms_acceptance table

  1. Changes
    - Add unique constraint on (user_id, terms_version) to prevent duplicate rows
    - This allows upsert operations to work correctly

  2. Why
    - Without this constraint, clicking approve/disapprove multiple times creates duplicate rows
    - maybeSingle() queries fail when duplicates exist
    - upsert needs a unique constraint to resolve conflicts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.legal_terms_acceptance'::regclass
    AND conname = 'legal_terms_acceptance_user_version_unique'
  ) THEN
    ALTER TABLE public.legal_terms_acceptance
      ADD CONSTRAINT legal_terms_acceptance_user_version_unique
      UNIQUE (user_id, terms_version);
  END IF;
END $$;
