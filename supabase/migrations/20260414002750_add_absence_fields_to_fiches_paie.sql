/*
  # Add absence and hourly rate fields to fiches_paie

  1. Modified Tables
    - `fiches_paie`
      - `nombre_absences` (numeric) - number of absence days in the period
      - `motifs_absences` (text) - comma-separated absence reasons
      - `salaire_horaire_brut` (numeric) - gross hourly salary rate used
      - `echelon` (text) - employee echelon at time of payslip generation

  2. Important Notes
    - These fields store the snapshot of data at generation time
    - Allows complete payslip reconstruction without querying other tables
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fiches_paie' AND column_name = 'nombre_absences'
  ) THEN
    ALTER TABLE fiches_paie ADD COLUMN nombre_absences numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fiches_paie' AND column_name = 'motifs_absences'
  ) THEN
    ALTER TABLE fiches_paie ADD COLUMN motifs_absences text NOT NULL DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fiches_paie' AND column_name = 'salaire_horaire_brut'
  ) THEN
    ALTER TABLE fiches_paie ADD COLUMN salaire_horaire_brut numeric NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fiches_paie' AND column_name = 'echelon'
  ) THEN
    ALTER TABLE fiches_paie ADD COLUMN echelon text NOT NULL DEFAULT '';
  END IF;
END $$;
