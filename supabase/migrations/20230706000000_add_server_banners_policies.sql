-- Create the server-banners bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
SELECT 'server-banners', 'server-banners'
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'server-banners'
);

-- Allow server owners to upload banners
CREATE POLICY "Server owners can upload banners"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'server-banners' 
    AND EXISTS (
        SELECT 1 FROM servers 
        WHERE owner_id = auth.uid() 
        AND (storage.foldername(name))[1] = servers.id::text
    )
);

-- Allow server owners to update and delete their server banners
CREATE POLICY "Server owners can manage their banners"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'server-banners'
    AND EXISTS (
        SELECT 1 FROM servers 
        WHERE owner_id = auth.uid() 
        AND (storage.foldername(name))[1] = servers.id::text
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
