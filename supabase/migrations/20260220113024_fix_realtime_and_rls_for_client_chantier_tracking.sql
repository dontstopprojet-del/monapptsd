/*
  # Fix real-time and RLS for client chantier tracking

  1. Changes
    - Enable real-time publication for site_images and site_notes tables
    - Fix site_notes SELECT policy so clients can view notes for their chantiers
    - Fix site_images SELECT policy so clients can view images for their chantiers
    - This allows the client to see photos, notes, and activity updates in real-time

  2. Security
    - Clients can only view site_images/site_notes for chantiers where they are the client
    - Technicians can view for chantiers they are assigned to
    - Admin/office/ceo can view all
*/

ALTER PUBLICATION supabase_realtime ADD TABLE site_images;
ALTER PUBLICATION supabase_realtime ADD TABLE site_notes;

DROP POLICY IF EXISTS "Users can view own site notes" ON site_notes;
CREATE POLICY "Users can view site notes for their chantiers"
  ON site_notes
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM chantiers c
      WHERE c.id::text = site_notes.site_id
      AND (
        c.client_id = (SELECT auth.uid())
        OR c.technician_id IN (SELECT t.id FROM technicians t WHERE t.profile_id = (SELECT auth.uid()))
      )
    )
    OR EXISTS (
      SELECT 1 FROM app_users u
      WHERE u.id = (SELECT auth.uid())
      AND u.role = ANY (ARRAY['admin'::text, 'office'::text, 'ceo'::text])
    )
  );

DROP POLICY IF EXISTS "Users can view own site images" ON site_images;
CREATE POLICY "Users can view site images for their chantiers"
  ON site_images
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM chantiers c
      WHERE c.id::text = site_images.site_id
      AND (
        c.client_id = (SELECT auth.uid())
        OR c.technician_id IN (SELECT t.id FROM technicians t WHERE t.profile_id = (SELECT auth.uid()))
      )
    )
    OR EXISTS (
      SELECT 1 FROM app_users u
      WHERE u.id = (SELECT auth.uid())
      AND u.role = ANY (ARRAY['admin'::text, 'office'::text, 'ceo'::text])
    )
  );
