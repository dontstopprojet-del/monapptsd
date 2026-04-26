/*
  # Fix site_id type for mock data compatibility

  1. Changes
    - Change `site_id` type from UUID to TEXT in `site_images` table
    - Change `site_id` type from UUID to TEXT in `site_notes` table
    
  2. Reason
    - The application uses mock data with numeric IDs (1, 2, 3, etc.)
    - The database expects UUIDs for site_id
    - This mismatch prevents images from being inserted
    - Changing to TEXT allows any identifier format
*/

-- Change site_id type in site_images
ALTER TABLE site_images 
  ALTER COLUMN site_id TYPE TEXT;

-- Change site_id type in site_notes
ALTER TABLE site_notes 
  ALTER COLUMN site_id TYPE TEXT;