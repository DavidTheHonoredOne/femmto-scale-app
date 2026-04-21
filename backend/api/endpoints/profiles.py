"""
backend/api/endpoints/profiles.py
────────────────────────────────────────────────────────────────────────────────
Endpoints CRUD para la gestión de Perfiles.
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Perfil
from backend.schemas import ProfileCreate, ProfileResponse, ProfileUpdate

router = APIRouter()


@router.get("/", response_model=List[ProfileResponse])
def get_profiles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Obtiene la lista de todos los perfiles de usuario.
    """
    perfiles = db.query(Perfil).offset(skip).limit(limit).all()
    return perfiles


@router.post("/", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(profile_in: ProfileCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo perfil biométrico guardándolo en base de datos.
    """
    nuevo_perfil = Perfil(**profile_in.model_dump())
    db.add(nuevo_perfil)
    db.commit()
    db.refresh(nuevo_perfil)
    return nuevo_perfil


@router.get("/{profile_id}", response_model=ProfileResponse)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    """
    Obtiene los detalles de un perfil en específico dado su ID.
    """
    perfil = db.query(Perfil).filter(Perfil.id == profile_id).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Perfil con ID {profile_id} no encontrado."
        )
    return perfil


@router.put("/{profile_id}", response_model=ProfileResponse)
def update_profile(profile_id: int, profile_in: ProfileUpdate, db: Session = Depends(get_db)):
    """
    Actualiza la información de un perfil existente.
    """
    perfil = db.query(Perfil).filter(Perfil.id == profile_id).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Perfil con ID {profile_id} no encontrado."
        )
    
    # Extraer los datos enviados ignorando campos nulos (en Pydantic v2: exclude_unset=True)
    update_data = profile_in.model_dump(exclude_unset=True)
    for clave, valor in update_data.items():
        setattr(perfil, clave, valor)

    db.add(perfil)
    db.commit()
    db.refresh(perfil)
    return perfil


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    """
    Elimina permanentemente un perfil (y sus mediciones mediante Cascade Delete).
    """
    perfil = db.query(Perfil).filter(Perfil.id == profile_id).first()
    if not perfil:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Perfil con ID {profile_id} no encontrado."
        )
    
    db.delete(perfil)
    db.commit()
    return None
