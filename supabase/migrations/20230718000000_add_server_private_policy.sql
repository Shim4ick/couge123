-- Add policies for the is_private field in the servers table

-- First, ensure the is_private column exists with a default value of false
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'servers' AND column_name = 'is_private'
  ) THEN
    ALTER TABLE servers ADD COLUMN is_private BOOLEAN DEFAULT false;
  END IF;
END
$$;

-- Create policy to allow reading the is_private field
DROP POLICY IF EXISTS "Users can view server privacy settings" ON servers;
CREATE POLICY "Users can view server privacy settings" 
ON servers 
FOR SELECT 
USING (
  -- Server members can see the privacy setting
  auth.uid() IN (
    SELECT user_id FROM server_members WHERE server_id = id
  )
  -- Server owners can see the privacy setting
  OR auth.uid() = owner_id
);

-- Update the policy for updating servers to include is_private
DROP POLICY IF EXISTS "Server owners can update their servers" ON servers;
CREATE POLICY "Server owners can update their servers" 
ON servers 
FOR UPDATE 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Grant explicit permissions on the is_private column
GRANT SELECT, UPDATE (name, description, avatar_url, banner_url, is_private) ON servers TO authenticated;
GRANT SELECT, UPDATE (name, description, avatar_url, banner_url, is_private) ON servers TO service_role;

-- Add an index on is_private to improve query performance for public server listings
CREATE INDEX IF NOT EXISTS idx_servers_is_private ON servers(is_private);
