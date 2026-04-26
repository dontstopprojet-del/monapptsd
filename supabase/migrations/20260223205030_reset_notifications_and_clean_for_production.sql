/*
  # Reset notifications and clean data for production

  1. Changes
    - Delete all notifications (reset to zero)
    - Delete all call signals (transient data)
    - Delete all call history records
    - Delete all chatbot conversations
    - Mark all messages as read
    - Delete all user location tracking data (transient)
    - Delete all chantier activity logs (transient)
    - Delete all work shift records

  2. Notes
    - Business data preserved: chantiers, invoices, quotes, planning, stock, technicians, appointments
    - User accounts preserved
    - Conversations and messages preserved but marked as read
    - This prepares the system for clean production use
*/

DELETE FROM notifications;

DELETE FROM call_signals;

DELETE FROM call_history;

DELETE FROM chatbot_conversations;

UPDATE messages SET is_read = true WHERE is_read = false;

DELETE FROM user_locations;

DELETE FROM chantier_activities;

DELETE FROM work_shifts;
