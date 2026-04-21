"""
backend/database.py
────────────────────────────────────────────────────────────────────────────────
Configuración central de SQLAlchemy 2.0 para PostgreSQL (Neon).

Exporta:
  - engine        → Motor SQLAlchemy (úsalo para crear tablas con Base.metadata.create_all)
  - SessionLocal  → Fábrica de sesiones (no comparte estado entre requests)
  - Base          → Clase base declarativa para todos los modelos ORM
  - get_db()      → Generador de sesión para inyección de dependencias en FastAPI
"""

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

try:
    from backend.config import settings
except ModuleNotFoundError:
    # Fallback si se ejecuta directamente dentro del subdirectorio backend/
    from config import settings


# ── Motor ─────────────────────────────────────────────────────────────────────
# pool_pre_ping=True: SQLAlchemy verifica la conexión antes de usarla,
# evitando errores por conexiones inactivas en Neon (que cierra idle connections).
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
    echo=False,   # Cambiar a True en desarrollo si quieres ver el SQL generado
)


# ── Sesión ────────────────────────────────────────────────────────────────────
SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,  # Previene LazyLoadingError tras el commit
)


# ── Base declarativa ──────────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Clase base para todos los modelos ORM del proyecto."""
    pass


# ── Dependencia FastAPI ───────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    Generador de sesión de base de datos para inyección de dependencias en FastAPI.

    Uso en un router:
        @router.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()

    Garantiza que la sesión se cierra aunque ocurra una excepción.
    """
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── Health check (diagnóstico de conexión) ────────────────────────────────────
def check_connection() -> bool:
    """Verifica que la base de datos sea alcanzable. Útil en endpoints /health."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        print(f"Error de base de datos: {e}")
        return False


if __name__ == "__main__":
    # Ocultar la contraseña en el print
    url_segura = settings.DATABASE_URL.split('@')[-1] if '@' in settings.DATABASE_URL else "URL configurada"
    print(f"Probando conexión a Neon [{url_segura}]...")
    
    if check_connection():
        print("✅ ¡Conectado exitosamente a PostgreSQL (Neon)!")
    else:
        print("❌ Error al conectar con Neon. Verifica tu archivo .env")
