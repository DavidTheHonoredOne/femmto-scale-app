"""
backend/config.py
────────────────────────────────────────────────────────────────────────────────
Configuración centralizada con pydantic-settings.
Carga variables desde el archivo .env automáticamente.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


from pathlib import Path

# Soporta ejecutar desde la raíz del proyecto o desde backend/
_HERE = Path(__file__).parent          # carpeta donde vive config.py (backend/)
_ENV_FILE = _HERE / ".env"             # backend/.env  (ruta absoluta, siempre funciona)


class Settings(BaseSettings):
    """Variables de entorno requeridas por el backend."""

    DATABASE_URL: str

    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


# Instancia singleton importada por el resto de módulos
settings = Settings()  # type: ignore[call-arg]
