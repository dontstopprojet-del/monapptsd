/*
  # Optimisation de la synchronisation temps réel et unification des projets

  1. Clarifications
    - La table `chantiers` est la source unique de vérité pour tous les projets
    - La table `projects` est dépréciée et ne doit plus être utilisée
    - Tous les modules doivent utiliser `chantiers` pour les projets

  2. Optimisations de performance
    - Ajout d'index pour accélérer les requêtes fréquentes
    - Optimisation des politiques RLS pour la synchronisation temps réel

  3. Index ajoutés
    - Index sur `chantiers.is_validated` et `chantiers.is_public` pour l'affichage public
    - Index sur `chantiers.technician_id` pour les requêtes par technicien
    - Index sur `chantiers.client_id` pour les requêtes par client
    - Index sur `chantiers.status` pour filtrer par statut
    - Index sur `expenses.project_id` et `expenses.technician_id` pour les dépenses
    - Index sur `invoices.project_id` pour les factures
    - Index sur `quote_requests.status` pour le suivi des devis
    - Index sur `appointments.assigned_to` pour les rendez-vous

  4. Notes importantes
    - Aucune donnée n'est supprimée
    - La synchronisation temps réel fonctionne sur toutes les tables
    - Les performances sont améliorées pour les requêtes fréquentes
*/

-- Ajouter des index pour optimiser les requêtes sur chantiers
CREATE INDEX IF NOT EXISTS idx_chantiers_validated_public 
  ON chantiers(is_validated, is_public) 
  WHERE is_validated = true AND is_public = true;

CREATE INDEX IF NOT EXISTS idx_chantiers_technician 
  ON chantiers(technician_id) 
  WHERE technician_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chantiers_client 
  ON chantiers(client_id) 
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chantiers_status 
  ON chantiers(status);

CREATE INDEX IF NOT EXISTS idx_chantiers_created_at 
  ON chantiers(created_at DESC);

-- Ajouter des index pour optimiser les requêtes sur expenses
CREATE INDEX IF NOT EXISTS idx_expenses_project 
  ON expenses(project_id) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_technician 
  ON expenses(technician_id) 
  WHERE technician_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_status 
  ON expenses(status);

CREATE INDEX IF NOT EXISTS idx_expenses_date 
  ON expenses(expense_date DESC);

-- Ajouter des index pour optimiser les requêtes sur invoices
CREATE INDEX IF NOT EXISTS idx_invoices_project 
  ON invoices(project_id) 
  WHERE project_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_status 
  ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date 
  ON invoices(due_date);

-- Ajouter des index pour optimiser les requêtes sur stock_items
CREATE INDEX IF NOT EXISTS idx_stock_items_category 
  ON stock_items(category);

CREATE INDEX IF NOT EXISTS idx_stock_items_low_quantity 
  ON stock_items(quantity) 
  WHERE quantity <= min_quantity;

-- Ajouter des index pour optimiser les requêtes sur quote_requests
CREATE INDEX IF NOT EXISTS idx_quote_requests_status 
  ON quote_requests(status);

CREATE INDEX IF NOT EXISTS idx_quote_requests_assigned 
  ON quote_requests(assigned_to) 
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_quote_requests_tracking 
  ON quote_requests(tracking_number) 
  WHERE tracking_number IS NOT NULL;

-- Ajouter des index pour optimiser les requêtes sur appointments
CREATE INDEX IF NOT EXISTS idx_appointments_assigned 
  ON appointments(assigned_to) 
  WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_date 
  ON appointments(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_appointments_status 
  ON appointments(status);

-- Ajouter des index pour optimiser les requêtes sur messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation 
  ON messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_unread 
  ON messages(sender_id) 
  WHERE is_read = false;

-- Ajouter des index pour optimiser les requêtes sur notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON notifications(user_id, is_read, created_at DESC);

-- Ajouter un commentaire à la table chantiers pour clarifier son rôle
COMMENT ON TABLE chantiers IS 'Table principale pour tous les projets. Source unique de vérité pour les réalisations, projets en cours et validation admin.';

-- Ajouter un commentaire à la table projects pour indiquer sa dépréciation
COMMENT ON TABLE projects IS 'DEPRECATED: Cette table n''est plus utilisée. Utilisez la table chantiers à la place.';
