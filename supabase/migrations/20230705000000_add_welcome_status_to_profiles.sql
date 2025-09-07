-- Добавляем колонку has_seen_beta_welcome в таблицу profiles
ALTER TABLE profiles
ADD COLUMN has_seen_beta_welcome BOOLEAN DEFAULT FALSE;
