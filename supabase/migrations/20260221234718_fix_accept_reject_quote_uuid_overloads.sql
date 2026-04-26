/*
  # Fix accept_quote(uuid) and reject_quote(uuid) overloads

  1. Problem
    - accept_quote(uuid) references response_date column which does not exist
    - reject_quote(uuid) also references response_date which does not exist
    - These overloads are used by the admin QuoteManagement component

  2. Fix
    - Use accepted_at / updated_at instead of response_date for accept
    - Use rejected_at / updated_at instead of response_date for reject
    - Match the same column usage as the text-based overloads
*/

CREATE OR REPLACE FUNCTION accept_quote(quote_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE quote_requests
  SET
    status = 'accepted',
    accepted_at = NOW(),
    updated_at = NOW()
  WHERE id = quote_id;
END;
$$;

CREATE OR REPLACE FUNCTION reject_quote(quote_id uuid, rejection_reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE quote_requests
  SET
    status = 'rejected',
    rejected_at = NOW(),
    rejected_reason = rejection_reason,
    updated_at = NOW()
  WHERE id = quote_id;
END;
$$;
