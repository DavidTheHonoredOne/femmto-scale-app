"""
backend/schemas.py
────────────────────────────────────────────────────────────────────────────────
Modelos de Pydantic para validación de datos (Requests/Responses).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Modulos Base (compartidos) ────────────────────────────────────────────────

class ProfileBase(BaseModel):
    """Atributos comunes para todos los modelos de perfil."""
    nombre: str = Field(..., example="Jose David")
    edad: int = Field(..., ge=1, le=120, example=19)
    estatura_cm: float = Field(..., gt=50, le=300, example=170.0)
    genero: str = Field(..., pattern="^(masculino|femenino)$", example="masculino")


# ── Schemas para Crear y Actualizar ──────────────────────────────────────────

class ProfileCreate(ProfileBase):
    """Datos requeridos al crear un nuevo perfil."""
    pass


class ProfileUpdate(BaseModel):
    """Todos los campos son opcionales al hacer una actualización (PATCH o PUT)."""
    nombre: Optional[str] = Field(None, example="Jose David")
    edad: Optional[int] = Field(None, ge=1, le=120, example=20)
    estatura_cm: Optional[float] = Field(None, gt=50, le=300, example=171.0)
    genero: Optional[str] = Field(None, pattern="^(masculino|femenino)$")


# ── Schemas de Respuesta ──────────────────────────────────────────────────────

class ProfileResponse(ProfileBase):
    """Datos devueltos al cliente (incluye DB ID y Timestamp)."""
    id: int
    created_at: datetime = Field(validation_alias="fecha_creacion")

    # Permite a Pydantic leer los datos directamente del modelo ORM de SQLAlchemy automatizando el .dict()
    model_config = ConfigDict(from_attributes=True)
