/*
  # Add Location Coordinates to Chantiers Table
  
  1. New Fields Added
    - `location_lat` (numeric) - Latitude of the job site
    - `location_lng` (numeric) - Longitude of the job site
    
  2. Purpose
    - Enable precise distance calculation from technician home to job site
    - Support GPS-based features for site management
    
  3. Notes
    - These coordinates complement the existing text-based location field
    - Can be populated via geocoding API or manual entry
*/

-- Add location coordinates fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chantiers' AND column_name = 'location_lat'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN location_lat numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chantiers' AND column_name = 'location_lng'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN location_lng numeric;
  END IF;
END $$;

-- Add some sample coordinates for existing chantiers (Conakry area)
UPDATE chantiers
SET 
  location_lat = 9.5092 + (RANDOM() * 0.1 - 0.05),
  location_lng = -13.7122 + (RANDOM() * 0.1 - 0.05)
WHERE location_lat IS NULL
AND id IN (SELECT id FROM chantiers LIMIT 5);