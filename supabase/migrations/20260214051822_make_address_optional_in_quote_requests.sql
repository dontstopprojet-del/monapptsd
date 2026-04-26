/*
  # Make Address Field Optional in Quote Requests

  1. Changes
    - Change `address` column to nullable in `quote_requests` table
    - This allows users to submit quotes with GPS location instead of text address
    
  2. Reason
    - GPS coordinates are more precise than text addresses
    - Users can now choose to share location instead of typing address
    - Improves user experience and data accuracy
*/

-- Make address column nullable
ALTER TABLE quote_requests ALTER COLUMN address DROP NOT NULL;
