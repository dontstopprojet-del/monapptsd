/*
  # Fix Remaining Function Overloads Search Path

  1. Problem
    - Multiple function overloads exist with different signatures
    - Some overloads still lack search_path configuration
    - Previous migration only fixed UUID versions
  
  2. Functions with Multiple Signatures
    - accept_quote: (text) and (uuid)
    - calculate_distance_km: (double precision x4) and (numeric x4)
    - get_user_role: () and (uuid)
    - record_quote_view: (text) and (uuid)
    - reject_quote: (text, text) and (uuid, text)
  
  3. Solution
    - Set search_path on all remaining overloads
    - Ensures all versions are protected
*/

-- Fix accept_quote(text)
ALTER FUNCTION accept_quote(text) SET search_path = pg_catalog, public;

-- Fix calculate_distance_km(numeric, numeric, numeric, numeric)
ALTER FUNCTION calculate_distance_km(numeric, numeric, numeric, numeric) SET search_path = pg_catalog, public;

-- Fix get_user_role() - no parameters version
ALTER FUNCTION get_user_role() SET search_path = pg_catalog, public;

-- Fix record_quote_view(text)
ALTER FUNCTION record_quote_view(text) SET search_path = pg_catalog, public;

-- Fix reject_quote(text, text)
ALTER FUNCTION reject_quote(text, text) SET search_path = pg_catalog, public;