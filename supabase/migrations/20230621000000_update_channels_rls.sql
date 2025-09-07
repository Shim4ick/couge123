-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Only server owners can create channels" ON channels;

-- Create a new policy that allows server owners to create channels
CREATE POLICY "Server owners can create channels"
ON channels
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM servers
    WHERE servers.id = channels.server_id
    AND servers.owner_id = auth.uid()
  )
);

-- Ensure RLS is enabled for the channels table
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
