-- Allow authenticated users to upload files to the avatars bucket
CREATE POLICY "Allow authenticated users to upload avatars"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);

-- Allow users to update and delete their own avatar files
CREATE POLICY "Allow users to update and delete their own avatars"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- Allow public read access to avatar files
CREATE POLICY "Allow public read access to avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');
