from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, field_validator

VALID_GENDERS = {"male", "female"}


class MeasurementCreate(BaseModel):
    measured_at: Optional[datetime] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    body_fat: Optional[float] = None
    muscle_mass: Optional[float] = None
    skeletal_muscle: Optional[float] = None
    visceral_fat: Optional[float] = None
    subcutaneous_fat: Optional[float] = None
    protein: Optional[float] = None
    body_water: Optional[float] = None
    bmr: Optional[float] = None
    body_age: Optional[int] = None
    standard_weight: Optional[float] = None
    fat_mass: Optional[float] = None
    fat_loss: Optional[float] = None
    muscle_frequency: Optional[float] = None
    skeletal_mass: Optional[float] = None


class Measurement(MeasurementCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    profile_id: int
    measured_at: datetime


class ProfileCreate(BaseModel):
    name: str
    height: float
    age: int
    gender: str

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        if v not in VALID_GENDERS:
            raise ValueError("gender must be 'male' or 'female'")
        return v


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    height: Optional[float] = None
    age: Optional[int] = None
    gender: Optional[str] = None

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_GENDERS:
            raise ValueError("gender must be 'male' or 'female'")
        return v


class Profile(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    height: float
    age: int
    gender: str
    created_at: datetime
    measurements: List[Measurement] = []


class ProfileWithLatest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    height: float
    age: int
    gender: str
    created_at: datetime
    latest_measurement: Optional[Measurement] = None
