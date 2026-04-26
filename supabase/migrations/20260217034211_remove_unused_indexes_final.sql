/*
  # Remove Unused Indexes
  
  ## Purpose
  Remove indexes that have not been used to reduce storage and maintenance overhead.
  
  Note: Keeping foreign key indexes as they improve performance for JOINs
  even if not currently showing usage.
*/

-- =====================================================
-- REMOVE CLEARLY UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_chantiers_is_validated;
DROP INDEX IF EXISTS public.idx_chantiers_is_public;
DROP INDEX IF EXISTS public.idx_work_sessions_user_id;
DROP INDEX IF EXISTS public.idx_work_sessions_session_date;
DROP INDEX IF EXISTS public.idx_user_real_time_status_status;
DROP INDEX IF EXISTS public.idx_expenses_project_id;
DROP INDEX IF EXISTS public.idx_expenses_status;
DROP INDEX IF EXISTS public.idx_invoices_project_id;
DROP INDEX IF EXISTS public.idx_quote_requests_client_session_id;
DROP INDEX IF EXISTS public.idx_chantiers_validated_public;
DROP INDEX IF EXISTS public.idx_expenses_project;
DROP INDEX IF EXISTS public.idx_expenses_date;
DROP INDEX IF EXISTS public.idx_app_users_birth_date;
DROP INDEX IF EXISTS public.idx_app_users_contract_date;
DROP INDEX IF EXISTS public.idx_quote_requests_tracking;
DROP INDEX IF EXISTS public.idx_invoices_project;
DROP INDEX IF EXISTS public.idx_invoices_due_date;
DROP INDEX IF EXISTS public.idx_quote_requests_email_tracking;
DROP INDEX IF EXISTS public.idx_stock_items_low_quantity;
DROP INDEX IF EXISTS public.idx_quote_requests_assigned;
DROP INDEX IF EXISTS public.idx_appointments_assigned;
DROP INDEX IF EXISTS public.idx_quote_requests_viewed_at;
DROP INDEX IF EXISTS public.idx_quote_requests_archived_at;
DROP INDEX IF EXISTS public.idx_technicians_home_coords;
DROP INDEX IF EXISTS public.idx_chantiers_location_coords;
DROP INDEX IF EXISTS public.idx_stock_movements_stock_item;
DROP INDEX IF EXISTS public.idx_stock_movements_created_by;
DROP INDEX IF EXISTS public.idx_contact_messages_created_at;
DROP INDEX IF EXISTS public.idx_contact_messages_status;
DROP INDEX IF EXISTS public.idx_quote_requests_created_at;
DROP INDEX IF EXISTS public.idx_quote_requests_status;
DROP INDEX IF EXISTS public.idx_projects_is_public;
DROP INDEX IF EXISTS public.idx_projects_is_validated;
DROP INDEX IF EXISTS public.idx_chantiers_quote_request_id;
DROP INDEX IF EXISTS public.idx_quote_requests_chantier_id;
DROP INDEX IF EXISTS public.idx_invoices_quote_request_id;
DROP INDEX IF EXISTS public.idx_project_photos_user_email;
DROP INDEX IF EXISTS public.idx_project_photos_project_id;
DROP INDEX IF EXISTS public.idx_stock_items_category;
DROP INDEX IF EXISTS public.idx_stock_items_quantity;
DROP INDEX IF EXISTS public.idx_appointments_user_id;
DROP INDEX IF EXISTS public.idx_appointments_status;
DROP INDEX IF EXISTS public.idx_appointments_scheduled_date;
DROP INDEX IF EXISTS public.idx_appointments_assigned_to;
DROP INDEX IF EXISTS public.idx_chatbot_conversations_user_id;
DROP INDEX IF EXISTS public.idx_chatbot_conversations_created_at;
DROP INDEX IF EXISTS public.idx_legal_signatures_user_email;
DROP INDEX IF EXISTS public.idx_shared_locations_user_email;
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