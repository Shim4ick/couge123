-- Создание таблицы servers с полем invite_code
CREATE TABLE servers (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Создание таблицы server_members
CREATE TABLE server_members (
  id BIGSERIAL PRIMARY KEY,
  server_id BIGINT NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(server_id, user_id)
);

-- Остальные таблицы остаются без изменений

-- Настройка политик доступа для таблицы servers

-- Разрешить чтение всем аутентифицированным пользователям
CREATE POLICY "Servers are viewable by authenticated users" 
ON servers FOR SELECT 
TO authenticated 
USING (true);

-- Разрешить создание серверов всем аутентифицированным пользователям
CREATE POLICY "Authenticated users can create servers" 
ON servers FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = owner_id);

-- Настройка политик доступа для таблицы server_members

-- Разрешить чтение членства в серверах всем аутентифицированным пользователям
CREATE POLICY "Server members are viewable by authenticated users" 
ON server_members FOR SELECT 
TO authenticated 
USING (true);

-- Разрешить добавление членов сервера аутентифицированным пользователям
CREATE POLICY "Authenticated users can join servers" 
ON server_members FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Включение Row Level Security для обеих таблиц
ALTER TABLE servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
