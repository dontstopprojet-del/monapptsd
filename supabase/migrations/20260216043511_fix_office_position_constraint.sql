/*
  # Correction de la contrainte office_position
  
  1. Modifications
    - Supprime l'ancienne contrainte CHECK sur office_position
    - Crée une nouvelle contrainte avec les valeurs correctes utilisées par le formulaire
    
  2. Valeurs autorisées
    - Directeur
    - Responsable administratif & financier
    - Responsable RH
    - Secrétaire / Assistante administrative
    - Comptable (interne ou externe)
    - Coordinateur
    - Magasinier
*/

-- Supprimer l'ancienne contrainte
ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_office_position_check;

-- Créer la nouvelle contrainte avec les valeurs correctes
ALTER TABLE app_users ADD CONSTRAINT app_users_office_position_check 
CHECK (
  office_position IS NULL OR 
  office_position IN (
    'Directeur',
    'Responsable administratif & financier',
    'Responsable RH',
    'Secrétaire / Assistante administrative',
    'Comptable (interne ou externe)',
    'Coordinateur',
    'Magasinier',
    'Assistant',
    'Secrétariat',
    'Finance',
    'Comptable',
    'RH',
    'Directeur Général',
    'Directeur Administratif'
  )
);
