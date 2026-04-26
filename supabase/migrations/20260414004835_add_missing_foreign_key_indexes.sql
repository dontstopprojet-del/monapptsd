/*
  # Add Missing Foreign Key Indexes

  1. Purpose
    - Add indexes on foreign key columns that are missing covering indexes
    - Improves JOIN and WHERE clause performance on these columns
    - Prevents sequential scans when doing FK lookups

  2. Tables and Columns Indexed
    - absences.created_by
    - admin_alerts.created_by
    - admin_settings.updated_by
    - appointments.assigned_to, appointments.user_id
    - birthdays.user_id
    - chantiers.quote_request_id, chantiers.service_id, chantiers.validated_by
    - chatbot_conversations.user_id
    - expenses.approved_by, expenses.project_id, expenses.technician_id
    - guinea_cities.commune_id, guinea_cities.prefecture_id
    - guinea_communes.prefecture_id
    - guinea_districts.commune_id
    - guinea_prefectures.region_id
    - guinea_villages.district_id
    - incidents.user_id
    - invoices.client_id, invoices.project_id, invoices.quote_request_id
    - legal_terms_acceptance.user_id
    - messages.invoice_id
    - mission_trips.chantier_id
    - non_compete_signatures.user_id
    - payment_records.user_id
    - planning.chantier_id, planning.technician_id
    - planning_technicians.technician_id
    - projects.validated_by
    - quote_requests.assigned_to, quote_requests.chantier_id
    - reports.created_by
    - reviews.chantier_id, reviews.client_id, reviews.technician_id
    - service_items.service_id
    - site_images.user_id
    - site_notes.user_id
    - stock_movements.created_by, stock_movements.stock_item_id
    - technician_gps_tracking.user_id
    - user_real_time_status.current_session_id
    - work_sessions.user_id
    - work_shifts.user_id

  3. Important Notes
    - All indexes use IF NOT EXISTS to prevent errors on re-run
    - These are standard B-tree indexes on FK columns
*/

CREATE INDEX IF NOT EXISTS idx_absences_created_by ON public.absences (created_by);
CREATE INDEX IF NOT EXISTS idx_admin_alerts_created_by ON public.admin_alerts (created_by);
CREATE INDEX IF NOT EXISTS idx_admin_settings_updated_by ON public.admin_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_appointments_assigned_to ON public.appointments (assigned_to);
CREATE INDEX IF NOT EXISTS idx_appointments_user_id ON public.appointments (user_id);
CREATE INDEX IF NOT EXISTS idx_birthdays_user_id ON public.birthdays (user_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_quote_request_id ON public.chantiers (quote_request_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_service_id ON public.chantiers (service_id);
CREATE INDEX IF NOT EXISTS idx_chantiers_validated_by ON public.chantiers (validated_by);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON public.chatbot_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by ON public.expenses (approved_by);
CREATE INDEX IF NOT EXISTS idx_expenses_project_id ON public.expenses (project_id);
CREATE INDEX IF NOT EXISTS idx_expenses_technician_id ON public.expenses (technician_id);
CREATE INDEX IF NOT EXISTS idx_guinea_cities_commune_id ON public.guinea_cities (commune_id);
CREATE INDEX IF NOT EXISTS idx_guinea_cities_prefecture_id ON public.guinea_cities (prefecture_id);
CREATE INDEX IF NOT EXISTS idx_guinea_communes_prefecture_id ON public.guinea_communes (prefecture_id);
CREATE INDEX IF NOT EXISTS idx_guinea_districts_commune_id ON public.guinea_districts (commune_id);
CREATE INDEX IF NOT EXISTS idx_guinea_prefectures_region_id ON public.guinea_prefectures (region_id);
CREATE INDEX IF NOT EXISTS idx_guinea_villages_district_id ON public.guinea_villages (district_id);
CREATE INDEX IF NOT EXISTS idx_incidents_user_id ON public.incidents (user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices (client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices (project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_quote_request_id ON public.invoices (quote_request_id);
CREATE INDEX IF NOT EXISTS idx_legal_terms_acceptance_user_id ON public.legal_terms_acceptance (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_invoice_id ON public.messages (invoice_id);
CREATE INDEX IF NOT EXISTS idx_mission_trips_chantier_id ON public.mission_trips (chantier_id);
CREATE INDEX IF NOT EXISTS idx_non_compete_signatures_user_id ON public.non_compete_signatures (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON public.payment_records (user_id);
CREATE INDEX IF NOT EXISTS idx_planning_chantier_id ON public.planning (chantier_id);
CREATE INDEX IF NOT EXISTS idx_planning_technician_id ON public.planning (technician_id);
CREATE INDEX IF NOT EXISTS idx_planning_technicians_technician_id ON public.planning_technicians (technician_id);
CREATE INDEX IF NOT EXISTS idx_projects_validated_by ON public.projects (validated_by);
CREATE INDEX IF NOT EXISTS idx_quote_requests_assigned_to ON public.quote_requests (assigned_to);
CREATE INDEX IF NOT EXISTS idx_quote_requests_chantier_id ON public.quote_requests (chantier_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON public.reports (created_by);
CREATE INDEX IF NOT EXISTS idx_reviews_chantier_id ON public.reviews (chantier_id);
CREATE INDEX IF NOT EXISTS idx_reviews_client_id ON public.reviews (client_id);
CREATE INDEX IF NOT EXISTS idx_reviews_technician_id ON public.reviews (technician_id);
CREATE INDEX IF NOT EXISTS idx_service_items_service_id ON public.service_items (service_id);
CREATE INDEX IF NOT EXISTS idx_site_images_user_id ON public.site_images (user_id);
CREATE INDEX IF NOT EXISTS idx_site_notes_user_id ON public.site_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON public.stock_movements (created_by);
CREATE INDEX IF NOT EXISTS idx_stock_movements_stock_item_id ON public.stock_movements (stock_item_id);
CREATE INDEX IF NOT EXISTS idx_technician_gps_tracking_user_id ON public.technician_gps_tracking (user_id);
CREATE INDEX IF NOT EXISTS idx_user_real_time_status_current_session_id ON public.user_real_time_status (current_session_id);
CREATE INDEX IF NOT EXISTS idx_work_sessions_user_id ON public.work_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_work_shifts_user_id ON public.work_shifts (user_id);
