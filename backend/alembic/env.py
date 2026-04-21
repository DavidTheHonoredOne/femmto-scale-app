"""
backend/alembic/env.py
────────────────────────────────────────────────────────────────────────────────
Configuración de Alembic para migraciones automáticas.
Usa el engine y los modelos del proyecto directamente (sin duplicar la URL).
"""

from logging.config import fileConfig
import sys
from pathlib import Path

# Añadir la raíz del proyecto al path para que los imports de backend/ funcionen
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from alembic import context
from sqlalchemy import engine_from_config, pool

# ── Importar Base (con todos los modelos registrados) y el engine real ─────────
from backend.database import engine
from backend.models import Base  # noqa: F401 — los modelos deben estar importados

# ── Configuración de Alembic ───────────────────────────────────────────────────
config = context.config

# Configurar logging desde alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata de los modelos → Alembic la usa para detectar cambios (--autogenerate)
target_metadata = Base.metadata


# ── Migración offline (sin conexión activa) ────────────────────────────────────
def run_migrations_offline() -> None:
    """Genera SQL sin conectarse a la base de datos (útil para revisar SQL)."""
    url = engine.url
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ── Migración online (conectado a Neon) ────────────────────────────────────────
def run_migrations_online() -> None:
    """Aplica migraciones directamente contra la base de datos."""
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
