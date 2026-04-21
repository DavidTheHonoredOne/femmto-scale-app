"""
backend/api/endpoints/measurements.py
────────────────────────────────────────────────────────────────────────────────
Endpoints para el registro y consulta del historial de mediciones BIA.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Medicion, Perfil
from backend.schemas import MeasurementCreate, MeasurementResponse

router = APIRouter()


@router.post("/", response_model=MeasurementResponse, status_code=status.HTTP_201_CREATED)
def create_measurement(measurement_in: MeasurementCreate, db: Session = Depends(get_db)):
    """
    Registra una nueva medición BIA vinculada a un perfil existente.

    - Verifica que el `profile_id` exista antes de insertar (404 si no).
    - Mapea los nombres del schema a los nombres de columna del ORM.
    """
    # ── Validar que el perfil exista ────────────────────────────────────────
    perfil = db.query(Perfil).filter(Perfil.id == measurement_in.profile_id).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Perfil con ID {measurement_in.profile_id} no encontrado.",
        )

    # ── Mapear schema → columnas ORM ────────────────────────────────────────
    # Los nombres en MeasurementCreate son los nombres del schema (API-friendly).
    # El ORM usa nombres distintos: bmr_kcal→bmr, grasa_corporal_pct→grasa_corporal, etc.
    nueva_medicion = Medicion(
        perfil_id=measurement_in.profile_id,
        peso_kg=measurement_in.peso_kg,
        imc=measurement_in.imc,
        bmr=measurement_in.bmr_kcal,
        peso_estandar=measurement_in.peso_estandar_kg,
        grasa_corporal=measurement_in.grasa_corporal_pct,
        masa_muscular=measurement_in.masa_muscular_kg,
        agua_corporal=measurement_in.agua_corporal_pct,
        frecuencia_muscular=measurement_in.impedancia_ohms,
        edad_corporal=measurement_in.edad_corporal,
        grasa_visceral=measurement_in.grasa_visceral,
    )

    db.add(nueva_medicion)
    db.commit()
    db.refresh(nueva_medicion)
    return nueva_medicion


@router.get(
    "/profile/{profile_id}",
    response_model=List[MeasurementResponse],
)
def get_measurements_by_profile(profile_id: int, db: Session = Depends(get_db)):
    """
    Devuelve el historial completo de mediciones de un perfil, ordenado
    por fecha de registro de más reciente a más antiguo.

    - Lanza 404 si el perfil no existe.
    """
    # ── Validar que el perfil exista ────────────────────────────────────────
    perfil = db.query(Perfil).filter(Perfil.id == profile_id).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Perfil con ID {profile_id} no encontrado.",
        )

    # ── Consultar mediciones ordenadas desc por fecha ───────────────────────
    mediciones = (
        db.query(Medicion)
        .filter(Medicion.perfil_id == profile_id)
        .order_by(Medicion.fecha.desc())
        .all()
    )
    return mediciones
