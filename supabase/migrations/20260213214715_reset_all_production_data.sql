/*
  # Réinitialisation complète des données de production

  1. Données supprimées
    - Suppression de toutes les données dans `projects`
    - Suppression de toutes les données dans `expenses`
    - Suppression de toutes les données dans `invoices`
    - Suppression de toutes les données dans `stock_items`
    - Suppression de toutes les données dans `stock_movements`
    - Suppression de toutes les données dans `planning`
    - Suppression de toutes les données dans `chantiers` (projets)

  2. Notes importantes
    - Les structures de tables sont conservées
    - Seules les données sont supprimées
    - Les politiques RLS restent en place
    - Reset propre pour la production
*/

-- Supprimer les données de la table stock_movements en premier (dépendances)
DELETE FROM stock_movements;

-- Supprimer les données de la table stock_items
DELETE FROM stock_items;

-- Supprimer les données de la table expenses
DELETE FROM expenses;

-- Supprimer les données de la table invoices
DELETE FROM invoices;

-- Supprimer les données de la table planning
DELETE FROM planning;

-- Supprimer les données de la table projects
DELETE FROM projects;

-- Supprimer les données de la table chantiers
DELETE FROM chantiers;
