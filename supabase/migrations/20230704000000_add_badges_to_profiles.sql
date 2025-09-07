-- Добавляем колонку badges в таблицу profiles, если она еще не существует
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'profiles' AND column_name = 'badges') THEN
    ALTER TABLE profiles
    ADD COLUMN badges TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Обновляем ограничение для допустимых типов бейджей
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS valid_badges;

ALTER TABLE profiles
ADD CONSTRAINT valid_badges CHECK (
  badges <@ ARRAY['founder', 'staff', 'beta']::text[]
);
