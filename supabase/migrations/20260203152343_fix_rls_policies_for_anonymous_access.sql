/*
  # Fix RLS Policies for Anonymous Access

  1. Changes
    - Add policies that allow anonymous users to interact with tables
    - This is a temporary fix for applications not using Supabase Auth
    - In production, proper authentication should be implemented

  2. Security Note
    - These policies allow broader access than ideal
    - Recommended to implement Supabase Auth for production use
*/

-- Fix app_users policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_users' 
    AND policyname = 'Allow anon to insert users'
  ) THEN
    CREATE POLICY "Allow anon to insert users"
      ON app_users FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_users' 
    AND policyname = 'Allow anon to view users'
  ) THEN
    CREATE POLICY "Allow anon to view users"
      ON app_users FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'app_users' 
    AND policyname = 'Allow anon to update users'
  ) THEN
    CREATE POLICY "Allow anon to update users"
      ON app_users FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix legal_terms_acceptance policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'legal_terms_acceptance' 
    AND policyname = 'Allow anon to insert legal terms'
  ) THEN
    CREATE POLICY "Allow anon to insert legal terms"
      ON legal_terms_acceptance FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'legal_terms_acceptance' 
    AND policyname = 'Allow anon to view legal terms'
  ) THEN
    CREATE POLICY "Allow anon to view legal terms"
      ON legal_terms_acceptance FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'legal_terms_acceptance' 
    AND policyname = 'Allow anon to update legal terms'
  ) THEN
    CREATE POLICY "Allow anon to update legal terms"
      ON legal_terms_acceptance FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix non_compete_signatures policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'non_compete_signatures' 
    AND policyname = 'Allow anon to insert non compete signatures'
  ) THEN
    CREATE POLICY "Allow anon to insert non compete signatures"
      ON non_compete_signatures FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'non_compete_signatures' 
    AND policyname = 'Allow anon to view non compete signatures'
  ) THEN
    CREATE POLICY "Allow anon to view non compete signatures"
      ON non_compete_signatures FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'non_compete_signatures' 
    AND policyname = 'Allow anon to update non compete signatures'
  ) THEN
    CREATE POLICY "Allow anon to update non compete signatures"
      ON non_compete_signatures FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix incidents policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'incidents' 
    AND policyname = 'Allow anon to insert incidents'
  ) THEN
    CREATE POLICY "Allow anon to insert incidents"
      ON incidents FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'incidents' 
    AND policyname = 'Allow anon to view incidents'
  ) THEN
    CREATE POLICY "Allow anon to view incidents"
      ON incidents FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'incidents' 
    AND policyname = 'Allow anon to update incidents'
  ) THEN
    CREATE POLICY "Allow anon to update incidents"
      ON incidents FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix work_shifts policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'work_shifts' 
    AND policyname = 'Allow anon to insert work shifts'
  ) THEN
    CREATE POLICY "Allow anon to insert work shifts"
      ON work_shifts FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'work_shifts' 
    AND policyname = 'Allow anon to view work shifts'
  ) THEN
    CREATE POLICY "Allow anon to view work shifts"
      ON work_shifts FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'work_shifts' 
    AND policyname = 'Allow anon to update work shifts'
  ) THEN
    CREATE POLICY "Allow anon to update work shifts"
      ON work_shifts FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix birthdays policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'birthdays' 
    AND policyname = 'Allow anon to manage birthdays'
  ) THEN
    CREATE POLICY "Allow anon to manage birthdays"
      ON birthdays FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix site_images policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_images' 
    AND policyname = 'Allow anon to insert site images'
  ) THEN
    CREATE POLICY "Allow anon to insert site images"
      ON site_images FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_images' 
    AND policyname = 'Allow anon to view site images'
  ) THEN
    CREATE POLICY "Allow anon to view site images"
      ON site_images FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Fix site_notes policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'site_notes' 
    AND policyname = 'Allow anon to manage site notes'
  ) THEN
    CREATE POLICY "Allow anon to manage site notes"
      ON site_notes FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Fix GPS tracking policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'technician_gps_tracking' 
    AND policyname = 'Allow anon to insert GPS tracking'
  ) THEN
    CREATE POLICY "Allow anon to insert GPS tracking"
      ON technician_gps_tracking FOR INSERT
      TO anon
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'technician_gps_tracking' 
    AND policyname = 'Allow anon to view GPS tracking'
  ) THEN
    CREATE POLICY "Allow anon to view GPS tracking"
      ON technician_gps_tracking FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;

-- Fix payment_records policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'payment_records' 
    AND policyname = 'Allow anon to view payment records'
  ) THEN
    CREATE POLICY "Allow anon to view payment records"
      ON payment_records FOR SELECT
      TO anon
      USING (true);
  END IF;
END $$;