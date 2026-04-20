from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("/", response_model=List[schemas.ProfileWithLatest])
def list_profiles(db: Session = Depends(get_db)):
    profiles = db.query(models.Profile).all()
    result = []
    for profile in profiles:
        latest = (
            db.query(models.Measurement)
            .filter(models.Measurement.profile_id == profile.id)
            .order_by(models.Measurement.measured_at.desc())
            .first()
        )
        result.append(
            schemas.ProfileWithLatest(
                id=profile.id,
                name=profile.name,
                height=profile.height,
                age=profile.age,
                gender=profile.gender,
                created_at=profile.created_at,
                latest_measurement=schemas.Measurement.model_validate(latest)
                if latest
                else None,
            )
        )
    return result


@router.post("/", response_model=schemas.Profile, status_code=status.HTTP_201_CREATED)
def create_profile(payload: schemas.ProfileCreate, db: Session = Depends(get_db)):
    profile = models.Profile(**payload.model_dump())
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/{profile_id}", response_model=schemas.Profile)
def get_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/{profile_id}", response_model=schemas.Profile)
def update_profile(
    profile_id: int,
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.delete("/{profile_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    db.delete(profile)
    db.commit()
