-- Add invite_code column to servers table if it doesn't exist
ALTER TABLE servers
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- Function to generate a random invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically generate invite code for new servers
CREATE OR REPLACE FUNCTION set_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  NEW.invite_code := generate_invite_code();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_server_invite_code
BEFORE INSERT ON servers
FOR EACH ROW
EXECUTE FUNCTION set_invite_code();

-- Update existing servers with invite codes if they don't have one
UPDATE servers
SET invite_code = generate_invite_code()
WHERE invite_code IS NULL;
