-- Add banner_url column to profiles table
ALTER TABLE profiles
ADD COLUMN banner_url TEXT;

-- Create storage bucket for banners if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('profile-banners', 'profile-banners')
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload profile banners
CREATE POLICY "Allow authenticated users to upload profile banners"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-banners');

-- Allow users to update and delete their own profile banners
CREATE POLICY "Allow users to update and delete their own profile banners"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'profile-banners');

-- Allow public read access to profile banner files
CREATE POLICY "Allow public read access to profile banners"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-banners');
