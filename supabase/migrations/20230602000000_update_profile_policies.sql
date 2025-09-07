-- Разрешить чтение профилей для аутентифицированных пользователей
CREATE POLICY "Profiles are viewable by authenticated users" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

-- Разрешить пользователям создавать свой профиль
CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

-- Разрешить пользователям обновлять свой профиль
CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

-- Включить RLS для таблицы profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
