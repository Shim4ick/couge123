-- Drop existing policies
DROP POLICY IF EXISTS "Allow members to view channels" ON channels;
DROP POLICY IF EXISTS "Allow members to view categories" ON categories;
DROP POLICY IF EXISTS "Server owners can manage channels" ON channels;
DROP POLICY IF EXISTS "Server owners can manage categories" ON categories;

-- Create new policy for channels to allow all members to view channels
CREATE POLICY "Allow members to view channels"
ON channels
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM server_members WHERE server_id = channels.server_id
  )
);

-- Create new policy for categories to allow all members to view categories
CREATE POLICY "Allow members to view categories"
ON categories
FOR SELECT
TO authenticated
USING (
  auth.uid() IN (
    SELECT user_id FROM server_members WHERE server_id = categories.server_id
  )
);

-- Ensure RLS is enabled for both tables
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policies for server owners to manage channels and categories
CREATE POLICY "Server owners can manage channels"
ON channels
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT owner_id FROM servers WHERE id = channels.server_id
  )
);

CREATE POLICY "Server owners can manage categories"
ON categories
FOR ALL
TO authenticated
USING (
  auth.uid() IN (
    SELECT owner_id FROM servers WHERE id = categories.server_id
  )
);
