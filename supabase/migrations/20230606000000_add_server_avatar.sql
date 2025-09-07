-- Add avatar_url column to servers table
ALTER TABLE servers
ADD COLUMN avatar_url TEXT;

-- Create storage bucket for server avatars if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('server-avatars', 'server-avatars')
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload server avatars
CREATE POLICY "Allow authenticated users to upload server avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'server-avatars');

-- Allow authenticated users to update and delete their own server avatars
CREATE POLICY "Allow users to update and delete their own server avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'server-avatars');

-- Allow public read access to server avatar files
CREATE POLICY "Allow public read access to server avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'server-avatars');
