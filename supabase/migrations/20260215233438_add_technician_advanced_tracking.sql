/*
  # Add Advanced Tracking Fields for Technicians
  
  1. New Fields Added to `technicians` table
    - `home_address` (text) - Address of technician's home
    - `home_lat` (numeric) - Latitude of technician's home for distance calculation
    - `home_lng` (numeric) - Longitude of technician's home for distance calculation
    - `absence_count` (integer) - Total number of absences
    - `sick_leave_count` (integer) - Total number of sick leave days
    - `complaint_count` (integer) - Total number of complaints filed
    
  2. Purpose
    - Enable distance calculation from technician home to job site
    - Track technician reliability metrics (absences, sick leaves)
    - Monitor customer satisfaction through complaint tracking
    - Provide comprehensive technician performance overview
    
  3. Notes
    - All new fields have sensible defaults (0 for counters, NULL for location)
    - Distance calculation will use Haversine formula for accuracy
    - These metrics help in optimal technician assignment decisions
*/

-- Add home location fields for distance calculation
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'home_address'
  ) THEN
    ALTER TABLE technicians ADD COLUMN home_address text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'home_lat'
  ) THEN
    ALTER TABLE technicians ADD COLUMN home_lat numeric;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'home_lng'
  ) THEN
    ALTER TABLE technicians ADD COLUMN home_lng numeric;
  END IF;
END $$;

-- Add tracking metrics
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'absence_count'
  ) THEN
    ALTER TABLE technicians ADD COLUMN absence_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'sick_leave_count'
  ) THEN
    ALTER TABLE technicians ADD COLUMN sick_leave_count integer DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'technicians' AND column_name = 'complaint_count'
  ) THEN
    ALTER TABLE technicians ADD COLUMN complaint_count integer DEFAULT 0;
  END IF;
END $$;

-- Create function to calculate distance between two coordinates using Haversine formula
CREATE OR REPLACE FUNCTION calculate_distance_km(
  lat1 numeric,
  lng1 numeric,
  lat2 numeric,
  lng2 numeric
) RETURNS numeric AS $$
DECLARE
  earth_radius_km constant numeric := 6371;
  dlat numeric;
  dlng numeric;
  a numeric;
  c numeric;
BEGIN
  -- Return NULL if any coordinate is missing
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Convert degrees to radians
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  
  -- Haversine formula
  a := sin(dlat / 2) * sin(dlat / 2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dlng / 2) * sin(dlng / 2);
  c := 2 * atan2(sqrt(a), sqrt(1 - a));
  
  -- Return distance in kilometers, rounded to 1 decimal place
  RETURN ROUND(earth_radius_km * c, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view for technician stats with calculated seniority
CREATE OR REPLACE VIEW technician_stats AS
SELECT 
  t.id,
  t.profile_id,
  t.role_level,
  t.status,
  t.completed_jobs,
  t.absence_count,
  t.sick_leave_count,
  t.complaint_count,
  t.home_address,
  t.home_lat,
  t.home_lng,
  t.contract_date,
  CASE 
    WHEN t.contract_date IS NOT NULL THEN 
      EXTRACT(YEAR FROM age(CURRENT_DATE, t.contract_date))::integer
    ELSE 0
  END as years_of_service,
  CASE 
    WHEN t.contract_date IS NOT NULL THEN 
      EXTRACT(MONTH FROM age(CURRENT_DATE, t.contract_date))::integer
    ELSE 0
  END as months_of_service
FROM technicians t;

COMMENT ON VIEW technician_stats IS 'Provides comprehensive technician statistics including calculated seniority';