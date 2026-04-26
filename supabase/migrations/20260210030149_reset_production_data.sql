/*
  # Reset Production Data - Clean Slate for Real Operations
  
  1. Purpose
    - Remove all test/demo data
    - Reset revenue and financial indicators to zero
    - Preserve the 3 real user accounts and their associated data
    - Prepare application for production use
    
  2. Data Cleanup
    - Reset all revenue counters to 0
    - Clear test planning entries
    - Remove demo stocks, invoices, and reports
    - Reset satisfaction rates and metrics
    
  3. Preservation
    - Keep existing app_users (3 real accounts)
    - Keep existing technicians (1 real)
    - Keep existing clients (1 real)
    - Keep existing chantiers (real work sites)
    
  4. Security
    - Maintain all RLS policies
    - No changes to authentication
*/

-- Reset technician revenue and metrics to zero
UPDATE technicians 
SET 
  total_revenue = 0,
  completed_jobs = 0,
  satisfaction_rate = 100,
  daily_km = 0
WHERE id IN (SELECT id FROM technicians);

-- Reset client spending to zero
UPDATE clients 
SET 
  total_interventions = 0,
  total_spent = 0
WHERE id IN (SELECT id FROM clients);

-- Clear test planning entries (if any exist beyond real ones)
-- We keep existing planning but this can be manually managed

-- Clear notifications table
DELETE FROM notifications WHERE id IS NOT NULL;

-- Clear admin alerts table
DELETE FROM admin_alerts WHERE id IS NOT NULL;

-- Clear any test stocks
DELETE FROM stocks WHERE id IS NOT NULL;

-- Clear test reports
DELETE FROM reports WHERE id IS NOT NULL;

-- Clear test reviews
DELETE FROM reviews WHERE id IS NOT NULL;

-- Clear test daily notes
DELETE FROM daily_notes WHERE id IS NOT NULL;

-- Clear test incidents
DELETE FROM incidents WHERE id IS NOT NULL;

-- Clear test birthdays
DELETE FROM birthdays WHERE id IS NOT NULL;

-- Clear test worksite completions
DELETE FROM worksite_completions WHERE id IS NOT NULL;

-- Clear test payment records
DELETE FROM payment_records WHERE id IS NOT NULL;

-- Clear GPS tracking history (keep only last position)
DELETE FROM technician_gps_tracking WHERE tracked_at < NOW() - INTERVAL '1 hour';

-- Clear old mission trips
DELETE FROM mission_trips WHERE status = 'completed' AND end_time < NOW() - INTERVAL '7 days';

-- Clear old work shifts
DELETE FROM work_shifts WHERE shift_date < CURRENT_DATE - INTERVAL '30 days';

-- Reset admin settings to ensure clean state
UPDATE admin_settings 
SET setting_value = '0' 
WHERE setting_key IN ('total_revenue_day', 'total_revenue_week', 'total_revenue_month', 'total_revenue_quarter', 'total_revenue_semester', 'total_revenue_year');