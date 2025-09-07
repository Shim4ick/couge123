-- Remove status field from profiles table
ALTER TABLE profiles DROP COLUMN IF EXISTS status;
