-- Добавляем поле gradient_color в таблицу server_roles
ALTER TABLE server_roles ADD COLUMN IF NOT EXISTS gradient_color TEXT;

-- Обновляем RLS политики для нового поля
CREATE POLICY "Server members can view role gradient colors" ON server_roles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM server_members
      WHERE server_members.server_id = server_roles.server_id
      AND server_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Server owners can update role gradient colors" ON server_roles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_roles.server_id
      AND servers.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM servers
      WHERE servers.id = server_roles.server_id
      AND servers.owner_id = auth.uid()
    )
  );
