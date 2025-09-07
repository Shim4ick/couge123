-- Add new columns to the servers table for the default invite link
ALTER TABLE servers
ADD COLUMN default_invite_code TEXT UNIQUE,
ADD COLUMN default_invite_uses INT DEFAULT 0,
ADD COLUMN default_invite_max_uses INT,
ADD COLUMN default_invite_expires_at TIMESTAMP WITH TIME ZONE;

-- Create a new table for custom invite links
CREATE TABLE invite_links (
  id SERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  max_uses INT,
  uses INT DEFAULT 0
);

-- Function to generate a unique invite code
CREATE OR REPLACE FUNCTION generate_unique_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    -- Check if the generated code already exists
    IF NOT EXISTS (
      SELECT 1 FROM servers WHERE default_invite_code = result
      UNION ALL
      SELECT 1 FROM invite_links WHERE code = result
    ) THEN
      RETURN result;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create a new invite link
CREATE OR REPLACE FUNCTION create_invite_link(
  p_server_id BIGINT,
  p_created_by UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE,
  p_max_uses INT
)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := generate_unique_invite_code();
  
  INSERT INTO invite_links (server_id, code, created_by, expires_at, max_uses)
  VALUES (p_server_id, new_code, p_created_by, p_expires_at, p_max_uses);
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Update existing servers with a default invite code
UPDATE servers
SET default_invite_code = generate_unique_invite_code()
WHERE default_invite_code IS NULL;
