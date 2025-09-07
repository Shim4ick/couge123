-- Убедимся, что RLS включен для таблицы servers
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

-- Политика для чтения серверов
CREATE POLICY "Users can view servers they are members of" ON servers
FOR SELECT USING (
  auth.uid() IN (
    SELECT user_id FROM server_members WHERE server_id = id
  )
);

-- Политика для обновления серверов
CREATE POLICY "Server owners can update their servers" ON servers
FOR UPDATE USING (
  auth.uid() = owner_id
) WITH CHECK (
  auth.uid() = owner_id
);

-- Политика для вставки серверов (если еще не создана)
CREATE POLICY "Users can create servers" ON servers
FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);

-- Политика для удаления серверов (если нужно)
CREATE POLICY "Server owners can delete their servers" ON servers
FOR DELETE USING (
  auth.uid() = owner_id
);
