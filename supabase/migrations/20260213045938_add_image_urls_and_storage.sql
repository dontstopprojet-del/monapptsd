/*
  # Ajout du champ image_urls à la table quote_requests et création du bucket de stockage

  1. Modifications
    - Ajout du champ `image_urls` (text array) à la table `quote_requests` pour stocker les URLs des images uploadées
    - Création du bucket de stockage `public-files` pour les images de devis

  2. Sécurité
    - Le bucket est configuré en mode public pour permettre l'accès aux images
    - Politiques permettant aux utilisateurs anonymes d'uploader, lire et supprimer des images
*/

-- Ajouter le champ image_urls si la table existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_requests') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'quote_requests' AND column_name = 'image_urls'
    ) THEN
      ALTER TABLE quote_requests ADD COLUMN image_urls text[];
    END IF;
  END IF;
END $$;

-- Créer le bucket de stockage public-files s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'public-files',
  'public-files',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow public upload" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read" ON storage.objects;
DROP POLICY IF EXISTS "Allow public delete" ON storage.objects;

-- Politique de stockage pour permettre l'upload public
CREATE POLICY "Allow public upload"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'public-files');

-- Politique de stockage pour permettre la lecture publique
CREATE POLICY "Allow public read"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public-files');

-- Politique de stockage pour permettre la suppression publique
CREATE POLICY "Allow public delete"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'public-files');
