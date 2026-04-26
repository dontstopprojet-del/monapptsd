/*
  # Refresh schema cache for legal_terms_acceptance

  1. Changes
    - Adds a COMMENT on the legal_terms_acceptance table to force PostgREST schema cache refresh
    - No structural changes to the table

  2. Why
    - PostgREST schema cache was stale and returning "table not found" errors
    - DDL statements on the table trigger a schema cache reload
*/

COMMENT ON TABLE public.legal_terms_acceptance IS 'Tracks user acceptance of legal terms and conditions';

-- Ensure grants are correct for PostgREST
GRANT SELECT, INSERT, UPDATE ON public.legal_terms_acceptance TO authenticated;
GRANT SELECT ON public.legal_terms_acceptance TO anon;

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';
