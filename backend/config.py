"""
backend/config.py
────────────────────────────────────────────────────────────────────────────────
Configuración centralizada con pydantic-settings.
Carga variables desde el archivo .env automáticamente.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Variables de entorno requeridas por el backend."""

    DATABASE_URL: str

    model_config = SettingsConfigDict(
        env_file=".env",          # Busca .env en el directorio de trabajo
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",           # Ignora variables no declaradas (ej. claves BLE)
    )


# Instancia singleton importada por el resto de módulos
settings = Settings()  # type: ignore[call-arg]
