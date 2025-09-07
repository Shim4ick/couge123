-- Add is_verified column to profiles table
ALTER TABLE profiles
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

-- Update existing profiles to have is_verified as false
UPDATE profiles
SET is_verified = FALSE
WHERE is_verified IS NULL;
