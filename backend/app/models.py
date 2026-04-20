from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum


def _utcnow():
    return datetime.now(timezone.utc)

from app.database import Base


class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"


class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    height = Column(Float, nullable=False)  # cm
    age = Column(Integer, nullable=False)
    gender = Column(Enum(GenderEnum), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    measurements = relationship(
        "Measurement", back_populates="profile", cascade="all, delete-orphan"
    )


class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(Integer, primary_key=True, index=True)
    profile_id = Column(Integer, ForeignKey("profiles.id"), nullable=False, index=True)
    measured_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    weight = Column(Float, nullable=True)
    bmi = Column(Float, nullable=True)
    body_fat = Column(Float, nullable=True)
    muscle_mass = Column(Float, nullable=True)
    skeletal_muscle = Column(Float, nullable=True)
    visceral_fat = Column(Float, nullable=True)
    subcutaneous_fat = Column(Float, nullable=True)
    protein = Column(Float, nullable=True)
    body_water = Column(Float, nullable=True)
    bmr = Column(Float, nullable=True)
    body_age = Column(Integer, nullable=True)
    standard_weight = Column(Float, nullable=True)
    fat_mass = Column(Float, nullable=True)
    fat_loss = Column(Float, nullable=True)
    muscle_frequency = Column(Float, nullable=True)
    skeletal_mass = Column(Float, nullable=True)

    profile = relationship("Profile", back_populates="measurements")
