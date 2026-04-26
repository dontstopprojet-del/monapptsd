/*
  # Remove Unused Indexes
  
  ## Purpose
  Remove indexes that have never been used to reduce storage overhead and maintenance costs.
  These indexes were identified by Supabase's performance analysis as unused.
  
  ## Changes
  - Drop all unused indexes across various tables
  - Keeps only indexes that are actively used or required for foreign key constraints
*/

-- Remove unused indexes on chantiers
DROP INDEX IF EXISTS public.idx_chantiers_is_validated;
DROP INDEX IF EXISTS public.idx_chantiers_is_public;
DROP INDEX IF EXISTS public.idx_chantiers_validated_by;
DROP INDEX IF EXISTS public.idx_chantiers_validated_public;
DROP INDEX IF EXISTS public.idx_chantiers_technician;
DROP INDEX IF EXISTS public.idx_chantiers_client;
DROP INDEX IF EXISTS public.idx_chantiers_quote_request_id;
DROP INDEX IF EXISTS public.idx_chantiers_location_coords;

-- Remove unused indexes on work_sessions
DROP INDEX IF EXISTS public.idx_work_sessions_user_id;
DROP INDEX IF EXISTS public.idx_work_sessions_session_date;

-- Remove unused indexes on expenses
DROP INDEX IF EXISTS public.idx_expenses_technician_id;
DROP INDEX IF EXISTS public.idx_expenses_project_id;
DROP INDEX IF EXISTS public.idx_expenses_status;
DROP INDEX IF EXISTS public.idx_expenses_project;
DROP INDEX IF EXISTS public.idx_expenses_technician;
DROP INDEX IF EXISTS public.idx_expenses_date;

-- Remove unused indexes on user_real_time_status
DROP INDEX IF EXISTS public.idx_user_real_time_status_status;

-- Remove unused indexes on invoices
DROP INDEX IF EXISTS public.idx_invoices_project_id;
DROP INDEX IF EXISTS public.idx_invoices_project;
DROP INDEX IF EXISTS public.idx_invoices_due_date;
DROP INDEX IF EXISTS public.idx_invoices_client_id;
DROP INDEX IF EXISTS public.idx_invoices_quote_request_id;

-- Remove unused indexes on quote_requests
DROP INDEX IF EXISTS public.idx_quote_requests_client_session_id;
DROP INDEX IF EXISTS public.idx_quote_requests_tracking;
DROP INDEX IF EXISTS public.idx_quote_requests_email_tracking;
DROP INDEX IF EXISTS public.idx_quote_requests_assigned;
DROP INDEX IF EXISTS public.idx_quote_requests_viewed_at;
DROP INDEX IF EXISTS public.idx_quote_requests_archived_at;
DROP INDEX IF EXISTS public.idx_quote_requests_created_at;
DROP INDEX IF EXISTS public.idx_quote_requests_status;
DROP INDEX IF EXISTS public.idx_quote_requests_chantier_id;

-- Remove unused indexes on stock_items
DROP INDEX IF EXISTS public.idx_stock_items_low_quantity;
DROP INDEX IF EXISTS public.idx_stock_items_category;
DROP INDEX IF EXISTS public.idx_stock_items_quantity;

-- Remove unused indexes on stock_movements
DROP INDEX IF EXISTS public.idx_stock_movements_stock_item;
DROP INDEX IF EXISTS public.idx_stock_movements_created_by;

-- Remove unused indexes on appointments
DROP INDEX IF EXISTS public.idx_appointments_assigned;
DROP INDEX IF EXISTS public.idx_appointments_user_id;
DROP INDEX IF EXISTS public.idx_appointments_status;
DROP INDEX IF EXISTS public.idx_appointments_scheduled_date;
DROP INDEX IF EXISTS public.idx_appointments_assigned_to;

-- Remove unused indexes on technicians
DROP INDEX IF EXISTS public.idx_technicians_home_coords;

-- Remove unused indexes on contact_messages
DROP INDEX IF EXISTS public.idx_contact_messages_created_at;
DROP INDEX IF EXISTS public.idx_contact_messages_status;

-- Remove unused indexes on projects
DROP INDEX IF EXISTS public.idx_projects_is_public;
DROP INDEX IF EXISTS public.idx_projects_is_validated;

-- Remove unused indexes on app_users
DROP INDEX IF EXISTS public.idx_app_users_birth_date;
DROP INDEX IF EXISTS public.idx_app_users_contract_date;

-- Remove unused indexes on guinea geography tables
DROP INDEX IF EXISTS public.idx_prefectures_region;
DROP INDEX IF EXISTS public.idx_communes_prefecture;
DROP INDEX IF EXISTS public.idx_districts_commune;
DROP INDEX IF EXISTS public.idx_villages_district;
DROP INDEX IF EXISTS public.idx_communes_coords;
DROP INDEX IF EXISTS public.idx_districts_coords;
DROP INDEX IF EXISTS public.idx_villages_coords;
DROP INDEX IF EXISTS public.idx_regions_coords;
DROP INDEX IF EXISTS public.idx_prefectures_coords;
DROP INDEX IF EXISTS public.idx_cities_coords;
DROP INDEX IF EXISTS public.idx_cities_prefecture;
DROP INDEX IF EXISTS public.idx_cities_commune;

-- Remove unused indexes on project_photos
DROP INDEX IF EXISTS public.idx_project_photos_user_email;
DROP INDEX IF EXISTS public.idx_project_photos_project_id;

-- Remove unused indexes on chatbot_conversations
DROP INDEX IF EXISTS public.idx_chatbot_conversations_user_id;
DROP INDEX IF EXISTS public.idx_chatbot_conversations_created_at;

-- Remove unused indexes on legal_signatures
DROP INDEX IF EXISTS public.idx_legal_signatures_user_email;

-- Remove unused indexes on shared_locations
DROP INDEX IF EXISTS public.idx_shared_locations_user_email;

-- Remove unused indexes that were just created (not yet used)
DROP INDEX IF EXISTS public.idx_admin_alerts_created_by;
DROP INDEX IF EXISTS public.idx_admin_settings_updated_by;
DROP INDEX IF EXISTS public.idx_birthdays_user_id;
DROP INDEX IF EXISTS public.idx_chantiers_service_id;
DROP INDEX IF EXISTS public.idx_clients_profile_id;
DROP INDEX IF EXISTS public.idx_expenses_approved_by;
DROP INDEX IF EXISTS public.idx_incidents_user_id;
DROP INDEX IF EXISTS public.idx_legal_terms_acceptance_user_id;
DROP INDEX IF EXISTS public.idx_reviews_client_id;
DROP INDEX IF EXISTS public.idx_reviews_technician_id;
DROP INDEX IF EXISTS public.idx_service_items_service_id;
DROP INDEX IF EXISTS public.idx_messages_invoice_id;
DROP INDEX IF EXISTS public.idx_mission_trips_chantier_id;
DROP INDEX IF EXISTS public.idx_non_compete_signatures_user_id;
DROP INDEX IF EXISTS public.idx_payment_records_user_id;
DROP INDEX IF EXISTS public.idx_planning_chantier_id;
DROP INDEX IF EXISTS public.idx_planning_technician_id;
DROP INDEX IF EXISTS public.idx_planning_technicians_technician_id;
DROP INDEX IF EXISTS public.idx_projects_validated_by;
DROP INDEX IF EXISTS public.idx_reports_created_by;
DROP INDEX IF EXISTS public.idx_reviews_chantier_id;
DROP INDEX IF EXISTS public.idx_site_images_user_id;
DROP INDEX IF EXISTS public.idx_site_notes_user_id;
DROP INDEX IF EXISTS public.idx_technician_gps_tracking_user_id;
DROP INDEX IF EXISTS public.idx_user_real_time_status_current_session_id;
DROP INDEX IF EXISTS public.idx_work_shifts_user_id;