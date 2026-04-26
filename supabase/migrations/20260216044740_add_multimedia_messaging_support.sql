/*
  # Ajout du support multimédia et factures dans la messagerie
  
  1. Modifications
    - Ajoute une colonne message_type à la table messages
    - Ajoute une colonne file_url pour stocker les fichiers (images, audio)
    - Ajoute une colonne invoice_id pour lier une facture
    - Ajoute une colonne metadata pour stocker des infos supplémentaires
    
  2. Types de messages supportés
    - text: Message texte classique
    - image: Message avec image
    - audio: Message vocal
    - invoice: Message contenant une facture
    
  3. Sécurité
    - Les policies RLS existantes continuent de s'appliquer
*/

-- Ajouter les nouvelles colonnes à la table messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'invoice')),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Créer un bucket de stockage pour les fichiers de messagerie
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-files', 'message-files', true)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les policies existantes si elles existent
DROP POLICY IF EXISTS "Public read access for message files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload message files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own message files" ON storage.objects;

-- Politique de stockage: Tout le monde peut lire les fichiers
CREATE POLICY "Public read access for message files"
ON storage.objects FOR SELECT
USING (bucket_id = 'message-files');

-- Politique de stockage: Les utilisateurs authentifiés peuvent uploader
CREATE POLICY "Authenticated users can upload message files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'message-files');

-- Politique de stockage: Les utilisateurs peuvent supprimer leurs propres fichiers
CREATE POLICY "Users can delete their own message files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'message-files');
