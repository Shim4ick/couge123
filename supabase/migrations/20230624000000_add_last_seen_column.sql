-- Add last_seen column to profiles table
ALTER TABLE profiles
ADD COLUMN last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW());

-- Update existing profiles to have current timestamp
UPDATE profiles
SET last_seen = NOW()
WHERE last_seen IS NULL;
