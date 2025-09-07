-- Allow only server owners to create channels
CREATE POLICY "Only server owners can create channels"
ON channels
FOR INSERT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM servers
    WHERE servers.id = channels.server_id
    AND servers.owner_id = auth.uid()
  )
);

-- Allow server owners to delete their servers
CREATE POLICY "Server owners can delete their servers"
ON servers
FOR DELETE
TO authenticated
USING (owner_id = auth.uid());
