-- Добавить колонку handle для поиска по ID (если её ещё нет).
-- Выполнить из корня проекта:
--   docker exec -i chat-postgres psql -U chat -d chat_db < backend-fastapi/migrations/add_handle_to_users.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS handle VARCHAR(50);

-- Заполняем: slug(username) + _ + начало id, чтобы не было дубликатов
UPDATE users
SET handle = LOWER(REGEXP_REPLACE(TRIM(COALESCE(username, 'user')), '[^a-z0-9_]', '_', 'g')) || '_' || REPLACE(LEFT(id::text, 8), '-', '')
WHERE handle IS NULL OR handle = '';

ALTER TABLE users ALTER COLUMN handle SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_handle_key ON users (handle);
