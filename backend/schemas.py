"""
backend/schemas.py
────────────────────────────────────────────────────────────────────────────────
Modelos de Pydantic para validación de datos (Requests/Responses).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS DE PERFIL
# ══════════════════════════════════════════════════════════════════════════════

class ProfileBase(BaseModel):
    """Atributos comunes para todos los modelos de perfil."""
    nombre: str = Field(..., example="Jose David")
    edad: int = Field(..., ge=1, le=120, example=19)
    estatura_cm: float = Field(..., gt=50, le=300, example=170.0)
    genero: str = Field(..., pattern="^(masculino|femenino)$", example="masculino")


class ProfileCreate(ProfileBase):
    """Datos requeridos al crear un nuevo perfil."""
    pass


class ProfileUpdate(BaseModel):
    """Todos los campos son opcionales al hacer una actualización (PATCH o PUT)."""
    nombre: Optional[str] = Field(None, example="Jose David")
    edad: Optional[int] = Field(None, ge=1, le=120, example=20)
    estatura_cm: Optional[float] = Field(None, gt=50, le=300, example=171.0)
    genero: Optional[str] = Field(None, pattern="^(masculino|femenino)$")


class ProfileResponse(ProfileBase):
    """Datos devueltos al cliente (incluye DB ID y Timestamp)."""
    id: int
    created_at: datetime = Field(validation_alias="fecha_creacion")

    model_config = ConfigDict(from_attributes=True)


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS DE MEDICIÓN
# ══════════════════════════════════════════════════════════════════════════════

class MeasurementBase(BaseModel):
    """Campos opcionales de una medición BIA. Solo peso_kg es obligatorio."""

    # Obligatorio: capturado directamente de la báscula
    peso_kg: float = Field(..., gt=0, le=500, example=72.5)

    # Métricas base (calculadas sin impedancia)
    imc: Optional[float] = Field(None, ge=0, le=100, example=23.1)
    bmr_kcal: Optional[float] = Field(None, ge=0, example=1750.0)
    peso_estandar_kg: Optional[float] = Field(None, ge=0, example=68.0)

    # Métricas BIA (requieren impedancia válida)
    grasa_corporal_pct: Optional[float] = Field(None, ge=0, le=100, example=18.5)
    masa_muscular_kg: Optional[float] = Field(None, ge=0, example=55.0)
    agua_corporal_pct: Optional[float] = Field(None, ge=0, le=100, example=60.0)
    impedancia_ohms: Optional[float] = Field(None, ge=0, example=520.0)
    edad_corporal: Optional[int] = Field(None, ge=0, le=150, example=22)
    grasa_visceral: Optional[float] = Field(None, ge=0, example=5.0)


class MeasurementCreate(MeasurementBase):
    """Datos requeridos para registrar una nueva medición. Incluye la FK del perfil."""
    profile_id: int = Field(..., example=1)


class MeasurementResponse(MeasurementBase):
    """Datos devueltos al cliente tras crear o consultar una medición."""

    id: int

    # Mapeo ORM → API: perfil_id (ORM) → profile_id (API)
    profile_id: int = Field(validation_alias="perfil_id")

    # Mapeo ORM → API: fecha (ORM) → created_at (API)
    created_at: datetime = Field(validation_alias="fecha")

    # Mapeo ORM → API: nombres de columnas a nombres del schema base
    bmr_kcal: Optional[float] = Field(None, validation_alias="bmr")
    peso_estandar_kg: Optional[float] = Field(None, validation_alias="peso_estandar")
    grasa_corporal_pct: Optional[float] = Field(None, validation_alias="grasa_corporal")
    masa_muscular_kg: Optional[float] = Field(None, validation_alias="masa_muscular")
    agua_corporal_pct: Optional[float] = Field(None, validation_alias="agua_corporal")
    impedancia_ohms: Optional[float] = Field(None, validation_alias="frecuencia_muscular")

    model_config = ConfigDict(from_attributes=True)


# ══════════════════════════════════════════════════════════════════════════════
# SCHEMAS DE RENDIMIENTO DEPORTIVO
# ══════════════════════════════════════════════════════════════════════════════

class PerformanceBase(BaseModel):
    """Campos para un registro de rendimiento deportivo."""
    remate: Optional[float] = Field(None, ge=0, le=500, example=240.5)
    bloqueo: Optional[float] = Field(None, ge=0, le=500, example=230.0)
    envergadura: Optional[float] = Field(None, ge=0, le=300, example=180.0)


class PerformanceCreate(PerformanceBase):
    """Crear nuevo registro de rendimiento vinculado a un perfil."""
    profile_id: int = Field(..., example=1)


class PerformanceResponse(PerformanceBase):
    """Datos devueltos de un registro de rendimiento."""
    id: int
    profile_id: int = Field(validation_alias="perfil_id")
    created_at: datetime = Field(validation_alias="fecha")

    model_config = ConfigDict(from_attributes=True)
