-- Create server_roles table
CREATE TABLE server_roles (
  id BIGSERIAL PRIMARY KEY,
  server_id BIGINT REFERENCES servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#99AAB5',
  position INTEGER NOT NULL DEFAULT 0,
  display_separately BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create role_members junction table
CREATE TABLE role_members (
  id BIGSERIAL PRIMARY KEY,
  role_id BIGINT REFERENCES server_roles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(role_id, user_id)
);

-- Add indexes for better performance
CREATE INDEX idx_server_roles_server_id ON server_roles(server_id);
CREATE INDEX idx_role_members_role_id ON role_members(role_id);
CREATE INDEX idx_role_members_user_id ON role_members(user_id);

-- Add trigger to update updated_at column
CREATE OR REPLACE FUNCTION update_server_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_server_roles_updated_at
BEFORE UPDATE ON server_roles
FOR EACH ROW
EXECUTE FUNCTION update_server_roles_updated_at();

-- Add RLS policies
ALTER TABLE server_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_members ENABLE ROW LEVEL SECURITY;

-- Server owners can manage roles
CREATE POLICY "Server owners can manage roles"
ON server_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM servers
    WHERE servers.id = server_roles.server_id
    AND servers.owner_id = auth.uid()
  )
);

-- Server members can view roles
CREATE POLICY "Server members can view roles"
ON server_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = server_roles.server_id
    AND server_members.user_id = auth.uid()
  )
);

-- Server owners can manage role members
CREATE POLICY "Server owners can manage role members"
ON role_members
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM server_roles
    JOIN servers ON servers.id = server_roles.server_id
    WHERE server_roles.id = role_members.role_id
    AND servers.owner_id = auth.uid()
  )
);

-- Server members can view role members
CREATE POLICY "Server members can view role members"
ON role_members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM server_roles
    JOIN server_members ON server_members.server_id = server_roles.server_id
    WHERE server_roles.id = role_members.role_id
    AND server_members.user_id = auth.uid()
  )
);

-- Add this to the server_roles table if it doesn't already have it
ALTER TABLE server_roles ADD COLUMN IF NOT EXISTS icon_url TEXT;

-- Add RLS policy for role members to allow server members to view their own roles
CREATE POLICY "Users can view their own roles"
ON role_members
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
);
