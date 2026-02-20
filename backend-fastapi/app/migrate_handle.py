"""Миграция: добавить колонку handle в users при старте приложения."""
from sqlalchemy import text


async def run_handle_migration(conn):
    """Добавляет колонку handle, если её нет, и заполняет её."""
    r = await conn.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'users' AND column_name = 'handle'"
        )
    )
    if r.scalar() is not None:
        return

    await conn.execute(text("ALTER TABLE users ADD COLUMN handle VARCHAR(50)"))
    await conn.execute(
        text("""
            UPDATE users
            SET handle = LOWER(REGEXP_REPLACE(TRIM(COALESCE(username, 'user')), '[^a-z0-9_]', '_', 'g'))
                || '_' || REPLACE(SUBSTRING(id::text FROM 1 FOR 8), '-', '')
            WHERE handle IS NULL OR handle = ''
        """)
    )
    await conn.execute(text("ALTER TABLE users ALTER COLUMN handle SET NOT NULL"))
    await conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS users_handle_key ON users (handle)"))
