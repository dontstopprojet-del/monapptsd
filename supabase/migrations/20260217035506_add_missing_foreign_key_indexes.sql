/*
  # Add Missing Foreign Key Indexes
  
  ## Purpose
  Add indexes to all foreign key columns that don't have covering indexes.
  This significantly improves JOIN performance and foreign key constraint checks.
  
  ## Performance Impact
  - Faster JOIN operations
  - Faster foreign key validation
  - Better query optimization by the planner
  
  ## Tables Covered
  All tables with unindexed foreign keys
*/

-- admin_alerts
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_by ON public.admin_alerts(created_by);

-- admin_settings
CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_by ON public.admin_settings(updated_by);

-- appointments
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON public.appointments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments(user_id);

-- birthdays
CREATE INDEX IF NOT EXISTS idx_birthdays_user_id ON public.birthdays(user_id);

-- chantiers
CREATE INDEX IF NOT EXISTS idx_chantiers_client_id ON public.chantiers(client_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_quote_request_id ON public.chantiers(quote_request_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_service_id ON public.chantiers(service_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_technician_id ON public.chantiers(technician_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_validated_by ON public.chantiers(validated_by);

-- chatbot_conversations
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON public.chatbot_conversations(user_id);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_profile_id ON public.clients(profile_id);

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON public.expenses(approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses(project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_technician_id ON public.expenses(technician_id);

-- guinea geography tables
CREATE INDEX IF NOT EXISTS idx_guinea_cities_commune_id ON public.guinea_cities(commune_id);
CREATE INDEX IF NOT EXISTS idx_guinea_cities_prefecture_id ON public.guinea_cities(prefecture_id);
CREATE INDEX IF NOT EXISTS idx_guinea_communes_prefecture_id ON public.guinea_communes(prefecture_id);
CREATE INDEX IF NOT EXISTS idx_guinea_districts_commune_id ON public.guinea_districts(commune_id);
CREATE INDEX IF NOT EXISTS idx_guinea_prefectures_region_id ON public.guinea_prefectures(region_id);
CREATE INDEX IF NOT EXISTS idx_guinea_villages_district_id ON public.guinea_villages(district_id);

-- incidents
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON public.incidents(user_id);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_request_id ON public.invoices(quote_request_id);

-- legal_terms_acceptance
CREATE INDEX IF NOT EXISTS idx_legal_terms_acceptance_user_id ON public.legal_terms_acceptance(user_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_invoice_id ON public.messages(invoice_id);

-- mission_trips
CREATE INDEX IF NOT EXISTS idx_mission_trips_chantier_id ON public.mission_trips(chantier_id);

-- non_compete_signatures
CREATE INDEX IF NOT EXISTS idx_non_compete_signatures_user_id ON public.non_compete_signatures(user_id);

-- payment_records
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON public.payment_records(user_id);

-- planning
CREATE INDEX IF NOT EXISTS idx_planning_chantier_id ON public.planning(chantier_id);
CREATE INDEX IF NOT EXISTS idx_planning_technician_id ON public.planning(technician_id);

-- planning_technicians
CREATE INDEX IF NOT EXISTS idx_planning_technicians_technician_id ON public.planning_technicians(technician_id);

-- projects
CREATE INDEX IF NOT EXISTS idx_projects_validated_by ON public.projects(validated_by);

-- quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_assigned_to ON public.quote_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quote_requests_chantier_id ON public.quote_requests(chantier_id);

-- reports
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON public.reports(created_by);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_chantier_id ON public.reviews(chantier_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews(client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_technician_id ON public.reviews(technician_id);

-- service_items
CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON public.service_items(service_id);

-- site_images
CREATE INDEX IF NOT EXISTS idx_site_images_user_id ON public.site_images(user_id);

-- site_notes
CREATE INDEX IF NOT EXISTS idx_site_notes_user_id ON public.site_notes(user_id);

-- stock_movements
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON public.stock_movements(created_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_item_id ON public.stock_movements(stock_item_id);

-- technician_gps_tracking
CREATE INDEX IF NOT EXISTS idx_technician_gps_tracking_user_id ON public.technician_gps_tracking(user_id);

-- user_real_time_status
CREATE INDEX IF NOT EXISTS idx_user_real_time_status_current_session_id ON public.user_real_time_status(current_session_id);

-- work_sessions
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON public.work_sessions(user_id);

-- work_shifts
CREATE INDEX IF NOT EXISTS idx_work_shifts_user_id ON public.work_shifts(user_id);