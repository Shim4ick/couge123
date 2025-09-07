-- Add badges array column to profiles table
ALTER TABLE profiles
ADD COLUMN badges text[] DEFAULT '{}';

-- Add check constraint to ensure only valid badge types
ALTER TABLE profiles
ADD CONSTRAINT valid_badges CHECK (
  badges <@ ARRAY['founder', 'beta']::text[]
);
