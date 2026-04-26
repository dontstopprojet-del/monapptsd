/*
  # Enable Realtime for Admin Dashboard Tables
  
  1. Changes
    - Enable realtime replication for quote_requests table
    - Enable realtime replication for appointments table
    - Enable realtime replication for notifications table
    - Enable realtime replication for messages table
    - Enable realtime replication for chantiers table
    - Enable realtime replication for invoices table
    - Enable realtime replication for incidents table
    - Enable realtime replication for daily_notes table
    - Enable realtime replication for work_shifts table
  
  2. Purpose
    - Allow admin dashboard to receive real-time updates when new quotes are submitted
    - Allow admin to see appointment bookings instantly
    - Enable instant notifications and messaging synchronization
    - Provide live updates for all critical admin operations
  
  3. Security
    - Realtime respects existing RLS policies
    - No additional permissions are granted
    - Only authorized users will receive updates based on their RLS access
*/

-- Enable realtime for quote_requests (demandes de devis)
ALTER PUBLICATION supabase_realtime ADD TABLE quote_requests;

-- Enable realtime for appointments (rendez-vous)
ALTER PUBLICATION supabase_realtime ADD TABLE appointments;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for chantiers (projets)
ALTER PUBLICATION supabase_realtime ADD TABLE chantiers;

-- Enable realtime for invoices (factures)
ALTER PUBLICATION supabase_realtime ADD TABLE invoices;

-- Enable realtime for incidents
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;

-- Enable realtime for daily_notes
ALTER PUBLICATION supabase_realtime ADD TABLE daily_notes;

-- Enable realtime for work_shifts
ALTER PUBLICATION supabase_realtime ADD TABLE work_shifts;