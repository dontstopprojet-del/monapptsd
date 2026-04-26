/*
  # Add intervention profitability tracking fields

  1. Modified Tables
    - `chantiers`
      - `montant_facture_client` (numeric, default 0) - Amount invoiced to client
      - `cout_main_oeuvre` (numeric, default 0) - Labor cost
      - `cout_materiel` (numeric, default 0) - Material cost
      - `autres_depenses` (numeric, default 0) - Other expenses
      - `cout_total` (numeric, generated) - Total cost (labor + material + other)
      - `benefice_intervention` (numeric, generated) - Profit (invoice amount - total cost)

  2. Implementation
    - Uses PostgreSQL generated columns for automatic calculation
    - cout_total = cout_main_oeuvre + cout_materiel + autres_depenses
    - benefice_intervention = montant_facture_client - cout_total

  3. Important Notes
    - All monetary values default to 0
    - Generated columns are always computed automatically
    - No manual update needed for cout_total or benefice_intervention
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'montant_facture_client'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN montant_facture_client numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'cout_main_oeuvre'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN cout_main_oeuvre numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'cout_materiel'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN cout_materiel numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'autres_depenses'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN autres_depenses numeric DEFAULT 0 NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'cout_total'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN cout_total numeric GENERATED ALWAYS AS (cout_main_oeuvre + cout_materiel + autres_depenses) STORED;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chantiers' AND column_name = 'benefice_intervention'
  ) THEN
    ALTER TABLE chantiers ADD COLUMN benefice_intervention numeric GENERATED ALWAYS AS (montant_facture_client - (cout_main_oeuvre + cout_materiel + autres_depenses)) STORED;
  END IF;
END $$;