"""
backend/api/router.py
────────────────────────────────────────────────────────────────────────────────
Enrutador principal de la API. Agrupa todas las rutas (endpoints) de la aplicación.
"""

from fastapi import APIRouter

from backend.api.endpoints import measurements, profiles

# Enrutador principal que agrupará todas las rutas bajo /api/v1
api_router = APIRouter()

# Incorporamos las distintas rutas aquí
api_router.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
api_router.include_router(measurements.router, prefix="/measurements", tags=["Measurements"])

