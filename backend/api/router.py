"""
backend/api/router.py
────────────────────────────────────────────────────────────────────────────────
Enrutador principal de la API. Agrupa todas las rutas (endpoints) de la aplicación.
"""

from fastapi import APIRouter

# Enrutador principal que agrupará todas las rutas bajo /api/v1
api_router = APIRouter()

# Aquí se incluirán los routers de los endpoints en los próximos commits, por ejemplo:
# api_router.include_router(profiles.router, prefix="/profiles", tags=["Profiles"])
# api_router.include_router(measurements.router, prefix="/measurements", tags=["Measurements"])
