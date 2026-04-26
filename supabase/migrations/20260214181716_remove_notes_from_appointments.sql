/*
  # Remove notes field from appointments table

  1. Changes
    - Remove `notes` column from `appointments` table
    - This field was used to store client descriptions/notes for appointments
    - No longer needed as per client request

  2. Security
    - No RLS changes needed
    - Existing RLS policies remain intact
*/

-- Drop the notes column from appointments table
ALTER TABLE appointments DROP COLUMN IF EXISTS notes;
