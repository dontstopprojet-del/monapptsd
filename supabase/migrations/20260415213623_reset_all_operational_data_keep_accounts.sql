/*
  # Reset all operational data - keep user accounts

  1. Purpose
    - Clear ALL operational/transactional data back to zero
    - Preserve user accounts (app_users, profiles, auth.users)
    - Preserve reference data (Guinea geography tables)
    - Preserve system configuration (admin_settings, tarifs_horaires)

  2. Tables being cleared (TRUNCATE CASCADE)
    - Messaging: messages, conversations, chatbot_conversations
    - Calls: call_signals, call_history
    - Planning & Projects: planning, planning_technicians, chantiers, chantier_activities,
      projects, project_photos, worksite_completions
    - Quotes & Invoices: quotes, quote_requests, invoices, payment_records
    - Clients: clients
    - Technicians: technicians, technician_gps_tracking, evaluations_techniciens
    - Work tracking: work_shifts, work_sessions, work_session_events, heures_travail,
      absences, fiches_paie
    - Stock: stocks, stock_items, stock_movements
    - Notifications: notifications, notification_settings, admin_alerts
    - Incidents & Reports: incidents, reports
    - Legal: legal_signatures, legal_terms_acceptance, non_compete_signatures
    - Services: services, service_items, reviews
    - Locations: user_locations, shared_locations, site_images, site_notes
    - Expenses: expenses
    - Maintenance: contrats_maintenance, visites_contrat, installations_client,
      historique_interventions_installation
    - Urgences: urgences
    - Notes: daily_notes
    - Misc: contact_messages, birthdays, appointments, mission_trips,
      user_real_time_status, trigger_error_log

  3. Tables preserved
    - app_users (all user accounts)
    - profiles (user profiles)
    - admin_settings (system configuration)
    - tarifs_horaires (hourly rate configuration)
    - guinea_regions, guinea_prefectures, guinea_communes, guinea_districts,
      guinea_cities, guinea_villages (geography reference data)

  4. Important
    - Uses TRUNCATE ... CASCADE to handle foreign key dependencies
    - User accounts and login credentials are NOT affected
*/

TRUNCATE TABLE
  messages,
  conversations,
  chatbot_conversations,
  call_signals,
  call_history,
  planning_technicians,
  planning,
  chantier_activities,
  worksite_completions,
  project_photos,
  chantiers,
  projects,
  payment_records,
  invoices,
  quotes,
  quote_requests,
  clients,
  technician_gps_tracking,
  evaluations_techniciens,
  technicians,
  work_session_events,
  work_sessions,
  work_shifts,
  heures_travail,
  absences,
  fiches_paie,
  stock_movements,
  stock_items,
  stocks,
  notifications,
  notification_settings,
  admin_alerts,
  incidents,
  reports,
  legal_signatures,
  legal_terms_acceptance,
  non_compete_signatures,
  services,
  service_items,
  reviews,
  user_locations,
  shared_locations,
  site_images,
  site_notes,
  expenses,
  visites_contrat,
  contrats_maintenance,
  historique_interventions_installation,
  installations_client,
  urgences,
  daily_notes,
  contact_messages,
  birthdays,
  appointments,
  mission_trips,
  user_real_time_status,
  trigger_error_log
CASCADE;
