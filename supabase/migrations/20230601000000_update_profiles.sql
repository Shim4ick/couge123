-- Update the profiles table with new fields
ALTER TABLE profiles
ADD COLUMN username TEXT UNIQUE,
ADD COLUMN display_name TEXT,
ADD COLUMN status TEXT;

-- Create a function to generate a unique username
CREATE OR REPLACE FUNCTION generate_unique_username(base_username TEXT)
RETURNS TEXT AS $$
DECLARE
  new_username TEXT;
  counter INTEGER := 0;
BEGIN
  new_username := base_username;
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = new_username) LOOP
    counter := counter + 1;
    new_username := base_username || counter::TEXT;
  END LOOP;
  RETURN new_username;
END;
$$ LANGUAGE plpgsql;
