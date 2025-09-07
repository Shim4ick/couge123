-- Remove max_uses column from invite_links table
ALTER TABLE invite_links DROP COLUMN IF EXISTS max_uses;

-- Remove max_uses column from servers table (for default invite)
ALTER TABLE servers DROP COLUMN IF EXISTS default_invite_max_uses;

-- Update the create_invite_link function to remove max_uses parameter
CREATE OR REPLACE FUNCTION create_invite_link(
  p_server_id BIGINT,
  p_created_by UUID,
  p_expires_at TIMESTAMP WITH TIME ZONE
)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := generate_unique_invite_code();

  INSERT INTO invite_links (server_id, code, created_by, expires_at)
  VALUES (p_server_id, new_code, p_created_by, p_expires_at);

  RETURN new_code;
END;
$$ LANGUAGE plpgsql;
