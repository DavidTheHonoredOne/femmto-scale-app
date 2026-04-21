"""
backend/models.py
────────────────────────────────────────────────────────────────────────────────
Modelos ORM con SQLAlchemy 2.0 para la aplicación Belu's Scale.

Tablas:
  - perfil              → Datos fijos del usuario (nombre, edad, estatura, género)
  - medicion            → Resultado de cada pesaje BIA vinculado a un perfil
  - rendimiento_deportivo → Historial de métricas de rendimiento (remate, bloqueo, envergadura)

Relaciones:
  - Un perfil puede tener múltiples mediciones (one-to-many)
  - Un perfil puede tener múltiples registros de rendimiento (one-to-many)
  - Al eliminar un perfil se eliminan en cascada todas sus mediciones y rendimientos
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

try:
    from backend.database import Base
except ModuleNotFoundError:
    from database import Base


# ── Helpers ───────────────────────────────────────────────────────────────────

def _ahora_utc() -> datetime:
    """Devuelve la fecha/hora actual en UTC como valor por defecto."""
    return datetime.now(timezone.utc)


# ── Modelo: Perfil ─────────────────────────────────────────────────────────────

class Perfil(Base):
    """
    Perfil del usuario.
    Almacena datos biométricos fijos que se usan en los cálculos BIA.
    """

    __tablename__ = "perfil"

    # Clave primaria autoincremental
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Datos personales requeridos
    nombre: Mapped[str] = mapped_column(String(100), nullable=False)
    edad: Mapped[int] = mapped_column(Integer, nullable=False)
    estatura_cm: Mapped[float] = mapped_column(Float, nullable=False)

    # "masculino" | "femenino"
    genero: Mapped[str] = mapped_column(String(10), nullable=False)

    # Fecha de creación automática (UTC)
    fecha_creacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_ahora_utc,
        nullable=False,
    )

    # Relación inversa: lista de mediciones asociadas a este perfil
    mediciones: Mapped[list[Medicion]] = relationship(
        "Medicion",
        back_populates="perfil",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    # Relación inversa: historial de rendimiento deportivo
    rendimientos: Mapped[list[RendimientoDeportivo]] = relationship(
        "RendimientoDeportivo",
        back_populates="perfil",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="RendimientoDeportivo.fecha.desc()",
    )

    def __repr__(self) -> str:
        return f"<Perfil id={self.id} nombre={self.nombre!r} genero={self.genero}>"


# ── Modelo: Medicion ───────────────────────────────────────────────────────────

class Medicion(Base):
    """
    Resultado de un pesaje con análisis BIA.

    Todos los campos de composición corporal son opcionales para soportar
    mediciones sin descalzo (impedancia = 0), donde solo se pueden calcular
    las métricas base (peso, IMC, BMR, peso estándar).
    """

    __tablename__ = "medicion"

    # Clave primaria
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Clave foránea → elimina la medición si el perfil es borrado
    perfil_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("perfil.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Marca de tiempo automática del pesaje (UTC)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_ahora_utc,
        nullable=False,
    )

    # ── Métricas base (sin impedancia) ──────────────────────────────────────

    # Peso capturado de la báscula (obligatorio)
    peso_kg: Mapped[float] = mapped_column(Float, nullable=False)

    # Índice de Masa Corporal
    imc: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Tasa Metabólica Basal (Mifflin-St Jeor) en kcal
    bmr: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Peso corporal ideal (IMC = 22.0) en kg
    peso_estandar: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # ── Métricas BIA (requieren impedancia válida) ───────────────────────────

    # Porcentaje de grasa corporal total
    grasa_corporal: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Masa grasa absoluta en kg
    masa_grasa: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Masa muscular calculada en kg
    masa_muscular: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Frecuencia/control muscular (métrica adicional FitDays)
    frecuencia_muscular: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Músculo esquelético en kg
    musculo_esqueletico: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Masa esquelética (huesos) en kg
    masa_esqueletica: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Porcentaje de proteína corporal
    proteina: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Agua corporal total en litros (valor absoluto)
    contenido_agua: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Agua corporal en porcentaje del peso total
    agua_corporal: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Porcentaje de grasa subcutánea
    grasa_subcutanea: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Nivel de grasa visceral (índice, no porcentaje)
    grasa_visceral: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Edad metabólica estimada en años
    edad_corporal: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Relación hacia el perfil padre
    perfil: Mapped[Perfil] = relationship("Perfil", back_populates="mediciones")

    def __repr__(self) -> str:
        return (
            f"<Medicion id={self.id} perfil_id={self.perfil_id} "
            f"peso={self.peso_kg}kg fecha={self.fecha}>"
        )


# ── Modelo: RendimientoDeportivo ───────────────────────────────────────────────

class RendimientoDeportivo(Base):
    """
    Registro histórico de métricas de rendimiento deportivo.

    Permite registrar la evolución temporal de alcance (remate, bloqueo)
    y envergadura de cada perfil. Cada registro es un snapshot con fecha.
    """

    __tablename__ = "rendimiento_deportivo"

    # Clave primaria
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Clave foránea → elimina el registro si el perfil es borrado
    perfil_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("perfil.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Fecha del registro (UTC)
    fecha: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=_ahora_utc,
        nullable=False,
    )

    # Métricas de rendimiento (todas opcionales para permitir registros parciales)
    remate: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bloqueo: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    envergadura: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    # Relación hacia el perfil padre
    perfil: Mapped[Perfil] = relationship("Perfil", back_populates="rendimientos")

    def __repr__(self) -> str:
        return (
            f"<RendimientoDeportivo id={self.id} perfil_id={self.perfil_id} "
            f"remate={self.remate} bloqueo={self.bloqueo} fecha={self.fecha}>"
        )


# ── Creación de tablas (uso directo) ──────────────────────────────────────────

if __name__ == "__main__":
    try:
        from backend.database import engine
    except ModuleNotFoundError:
        from database import engine  # type: ignore[no-redef]

    print("Creando tablas en Neon PostgreSQL...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Tablas creadas.")
