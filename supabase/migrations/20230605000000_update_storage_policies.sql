-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update and delete their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;

-- Allow anyone to upload avatars (needed for registration)
CREATE POLICY "Allow anyone to upload avatars"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'avatars');

-- Allow authenticated users to update and delete their own avatar files
CREATE POLICY "Allow users to update and delete their own avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to avatar files
CREATE POLICY "Allow public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
