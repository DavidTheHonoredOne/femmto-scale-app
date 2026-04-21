"""
backend/api/endpoints/performance.py
────────────────────────────────────────────────────────────────────────────────
Endpoints para el registro y consulta del historial de rendimiento deportivo.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Perfil, RendimientoDeportivo
from backend.schemas import PerformanceCreate, PerformanceResponse

router = APIRouter()


@router.post("/", response_model=PerformanceResponse, status_code=status.HTTP_201_CREATED)
def create_performance_record(perf_in: PerformanceCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo punto de rendimiento deportivo para un perfil.
    """
    perfil = db.query(Perfil).filter(Perfil.id == perf_in.profile_id).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Perfil con ID {perf_in.profile_id} no encontrado.",
        )

    nuevo = RendimientoDeportivo(
        perfil_id=perf_in.profile_id,
        remate=perf_in.remate,
        bloqueo=perf_in.bloqueo,
        envergadura=perf_in.envergadura,
    )

    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


@router.get("/profile/{profile_id}", response_model=List[PerformanceResponse])
def get_performance_by_profile(profile_id: int, db: Session = Depends(get_db)):
    """
    Devuelve el historial completo de rendimiento de un perfil,
    ordenado de más reciente a más antiguo.
    """
    perfil = db.query(Perfil).filter(Perfil.id == profile_id).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Perfil con ID {profile_id} no encontrado.",
        )

    registros = (
        db.query(RendimientoDeportivo)
        .filter(RendimientoDeportivo.perfil_id == profile_id)
        .order_by(RendimientoDeportivo.fecha.desc())
        .all()
    )
    return registros


@router.get("/all", response_model=List[PerformanceResponse])
def get_all_performance_records(db: Session = Depends(get_db)):
    """
    Devuelve todos los registros de rendimiento de todos los perfiles.
    Útil para exportación global sin necesidad de N+1 requests.
    """
    registros = (
        db.query(RendimientoDeportivo)
        .order_by(RendimientoDeportivo.perfil_id, RendimientoDeportivo.fecha.desc())
        .all()
    )
    return registros
