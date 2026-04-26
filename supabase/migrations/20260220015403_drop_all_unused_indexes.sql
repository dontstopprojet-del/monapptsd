/*
  # Drop all unused indexes

  1. Changes
    - Drops 47 indexes that have never been used according to database monitoring
    - These indexes consume storage and slow down write operations without providing query benefits

  2. Tables affected
    - admin_alerts, admin_settings, appointments, birthdays, chantiers,
      chatbot_conversations, clients, expenses, guinea_cities, guinea_communes,
      guinea_districts, guinea_prefectures, guinea_villages, incidents, invoices,
      legal_terms_acceptance, messages, mission_trips, non_compete_signatures,
      payment_records, planning, planning_technicians, projects, quote_requests,
      reports, reviews, service_items, site_images, site_notes, stock_movements,
      technician_gps_tracking, user_real_time_status, work_sessions, work_shifts

  3. Important notes
    - These indexes can be recreated if future query patterns require them
    - All are non-unique, non-constraint indexes so dropping them is safe
*/

DROP INDEX IF EXISTS idx_admin_alerts_created_by;
DROP INDEX IF EXISTS idx_admin_settings_updated_by;
DROP INDEX IF EXISTS idx_appointments_assigned_to;
DROP INDEX IF EXISTS idx_appointments_user_id;
DROP INDEX IF EXISTS idx_birthdays_user_id;
DROP INDEX IF EXISTS idx_chantiers_quote_request_id;
DROP INDEX IF EXISTS idx_chantiers_service_id;
DROP INDEX IF EXISTS idx_chantiers_validated_by;
DROP INDEX IF EXISTS idx_chatbot_conversations_user_id;
DROP INDEX IF EXISTS idx_clients_profile_id;
DROP INDEX IF EXISTS idx_expenses_approved_by;
DROP INDEX IF EXISTS idx_expenses_project_id;
DROP INDEX IF EXISTS idx_expenses_technician_id;
DROP INDEX IF EXISTS idx_guinea_cities_commune_id;
DROP INDEX IF EXISTS idx_guinea_cities_prefecture_id;
DROP INDEX IF EXISTS idx_guinea_communes_prefecture_id;
DROP INDEX IF EXISTS idx_guinea_districts_commune_id;
DROP INDEX IF EXISTS idx_guinea_prefectures_region_id;
DROP INDEX IF EXISTS idx_guinea_villages_district_id;
DROP INDEX IF EXISTS idx_incidents_user_id;
DROP INDEX IF EXISTS idx_invoices_client_id;
DROP INDEX IF EXISTS idx_invoices_project_id;
DROP INDEX IF EXISTS idx_invoices_quote_request_id;
DROP INDEX IF EXISTS idx_legal_terms_acceptance_user_id;
DROP INDEX IF EXISTS idx_messages_invoice_id;
DROP INDEX IF EXISTS idx_mission_trips_chantier_id;
DROP INDEX IF EXISTS idx_non_compete_signatures_user_id;
DROP INDEX IF EXISTS idx_payment_records_user_id;
DROP INDEX IF EXISTS idx_planning_chantier_id;
DROP INDEX IF EXISTS idx_planning_technician_id;
DROP INDEX IF EXISTS idx_planning_technicians_technician_id;
DROP INDEX IF EXISTS idx_projects_validated_by;
DROP INDEX IF EXISTS idx_quote_requests_assigned_to;
DROP INDEX IF EXISTS idx_quote_requests_chantier_id;
DROP INDEX IF EXISTS idx_reports_created_by;
DROP INDEX IF EXISTS idx_reviews_chantier_id;
DROP INDEX IF EXISTS idx_reviews_client_id;
DROP INDEX IF EXISTS idx_reviews_technician_id;
DROP INDEX IF EXISTS idx_service_items_service_id;
DROP INDEX IF EXISTS idx_site_images_user_id;
DROP INDEX IF EXISTS idx_site_notes_user_id;
DROP INDEX IF EXISTS idx_stock_movements_created_by;
DROP INDEX IF EXISTS idx_stock_movements_stock_item_id;
DROP INDEX IF EXISTS idx_technician_gps_tracking_user_id;
DROP INDEX IF EXISTS idx_user_real_time_status_current_session_id;
DROP INDEX IF EXISTS idx_work_sessions_user_id;
DROP INDEX IF EXISTS idx_work_shifts_user_id;