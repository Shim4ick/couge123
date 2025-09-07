-- Add profile_color_1 and profile_color_2 columns to profiles table
ALTER TABLE profiles
ADD COLUMN profile_color_1 VARCHAR(7),
ADD COLUMN profile_color_2 VARCHAR(7);

-- Add a check constraint to ensure valid hex color format
ALTER TABLE profiles
ADD CONSTRAINT check_profile_color_1 CHECK (profile_color_1 ~ '^#[0-9A-Fa-f]{6}$'),
ADD CONSTRAINT check_profile_color_2 CHECK (profile_color_2 ~ '^#[0-9A-Fa-f]{6}$');
