from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db

router = APIRouter(prefix="/measurements", tags=["measurements"])


@router.get("/{profile_id}", response_model=List[schemas.Measurement])
def list_measurements(profile_id: int, db: Session = Depends(get_db)):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    return (
        db.query(models.Measurement)
        .filter(models.Measurement.profile_id == profile_id)
        .order_by(models.Measurement.measured_at.desc())
        .all()
    )


@router.post(
    "/{profile_id}",
    response_model=schemas.Measurement,
    status_code=status.HTTP_201_CREATED,
)
def create_measurement(
    profile_id: int,
    payload: schemas.MeasurementCreate,
    db: Session = Depends(get_db),
):
    profile = db.query(models.Profile).filter(models.Profile.id == profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    data = payload.model_dump()
    if data.get("measured_at") is None:
        data["measured_at"] = datetime.now(timezone.utc)

    measurement = models.Measurement(profile_id=profile_id, **data)
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@router.delete("/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_measurement(measurement_id: int, db: Session = Depends(get_db)):
    measurement = (
        db.query(models.Measurement)
        .filter(models.Measurement.id == measurement_id)
        .first()
    )
    if not measurement:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(measurement)
    db.commit()
