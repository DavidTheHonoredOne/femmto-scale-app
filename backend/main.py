"""
backend/main.py
────────────────────────────────────────────────────────────────────────────────
Punto de entrada principal de la aplicación FastAPI.
Configura middlewares, conexión a base de datos y monta el enrutador principal.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import check_connection, engine
from backend.models import Base
from backend.api.router import api_router

# ── Crear tablas en la base de datos (fallback dev) ───────────────────────────
# Aunque usamos Alembic, esto asegura que las tablas existan al arrancar
# si por alguna razón no se ejecutaron las migraciones en desarrollo local.
Base.metadata.create_all(bind=engine)

# ── Configuración de la aplicación FastAPI ────────────────────────────────────
app = FastAPI(
    title="Femmto Scale API",
    description="API para procesar y almacenar biometría de la báscula FEMMTO BCS15",
    version="1.0.0",
)

# ── Configurar CORS ───────────────────────────────────────────────────────────
# Permite peticiones desde el frontend (React/Vite local o producción)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modificar en producción
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Incluir el enrutador principal ────────────────────────────────────────────
# Todas las rutas definidas en api_router tendrán el prefijo /api/v1
app.include_router(api_router, prefix="/api/v1")

# ── Rutas Base ────────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {"message": "Bienvenido a la API de Femmto Scale. Ve a /docs para la documentación."}

@app.get("/health", tags=["Health"])
def health_check():
    """Endpoint para verificar el estado de la API y la base de datos."""
    db_status = "connected" if check_connection() else "disconnected"
    return {"status": "ok", "db": db_status}

# ── Ejecución directa (desarrollo) ────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    # Para ejecutar: python backend/main.py
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
