-- Drop existing policies
DROP POLICY IF EXISTS "Server owners can upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Server owners can manage their banners" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to server banners" ON storage.objects;

-- Allow authenticated users to upload banners
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'server-banners');

-- Allow server owners to manage their banners
CREATE POLICY "Server owners can manage their banners"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'server-banners'
    AND (
        auth.uid() IN (
            SELECT owner_id 
            FROM servers 
            WHERE id::text = (storage.foldername(name))[1]
        )
    )
);

-- Allow public read access to server banners
CREATE POLICY "Allow public read access to server banners"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'server-banners');

-- Enable RLS on the storage.objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
