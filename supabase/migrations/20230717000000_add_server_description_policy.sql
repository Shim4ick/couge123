-- Add policy to allow reading server description
CREATE POLICY "Allow users to read server description" ON public.servers
FOR SELECT
USING (
  -- Allow users to read description if they are a member of the server
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = servers.id
    AND server_members.profile_id = auth.uid()
  )
  -- Or if the server is public (if you have a public servers concept)
  OR servers.is_public = true
);

-- Make sure the description column has the proper permissions
GRANT SELECT (description) ON public.servers TO authenticated;
GRANT SELECT (description) ON public.servers TO service_role;

-- If you need to update the description, ensure the update policy includes the description field
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'servers' 
    AND policyname = 'Enable update for server owners'
  ) THEN
    DROP POLICY "Enable update for server owners" ON public.servers;
  END IF;
END
$$;

CREATE POLICY "Enable update for server owners" ON public.servers
FOR UPDATE
USING (
  -- Check if the user is the owner of the server
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = servers.id
    AND server_members.profile_id = auth.uid()
    AND server_members.is_owner = true
  )
)
WITH CHECK (
  -- Check if the user is the owner of the server
  EXISTS (
    SELECT 1 FROM server_members
    WHERE server_members.server_id = servers.id
    AND server_members.profile_id = auth.uid()
    AND server_members.is_owner = true
  )
);

-- Ensure the description column is included in the update permissions
GRANT UPDATE (name, description, avatar_url, banner_url) ON public.servers TO authenticated;
