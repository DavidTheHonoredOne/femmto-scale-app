"""
backend/seed.py
────────────────────────────────────────────────────────────────────────────────
Script de datos semilla (Seed Data) para el entorno de desarrollo.

ADVERTENCIA: Este script BORRA y RECREA los datos de prueba en cada ejecución.
             Úsalo SOLO en desarrollo contra la base de datos de Neon dev.

Uso:
    # Desde la raíz del proyecto con el venv activo:
    python backend/seed.py
"""

from datetime import datetime, timezone

from sqlalchemy.exc import SQLAlchemyError

try:
    from backend.database import SessionLocal
    from backend.models import Medicion, Perfil
except ModuleNotFoundError:
    from database import SessionLocal  # type: ignore[no-redef]
    from models import Medicion, Perfil  # type: ignore[no-redef]


# ── Datos de prueba ───────────────────────────────────────────────────────────

PERFIL_SEED = {
    "nombre": "Jose David",
    "edad": 19,
    "estatura_cm": 170.0,
    "genero": "masculino",
}

MEDICIONES_SEED = [
    {
        # Medicion 1 — pesaje con impedancia completa (datos bascula + BIA)
        "peso_kg": 80.10,
        "imc": 27.7,
        "grasa_corporal": 25.6,
        "masa_grasa": 20.5,
        "masa_muscular": 57.3,
        "agua_corporal": 53.3,
        "bmr": 1762.0,
        "edad_corporal": 21,
        "peso_estandar": 63.6,
        # Campos adicionales opcionales
        "frecuencia_muscular": None,
        "musculo_esqueletico": None,
        "masa_esqueletica": None,
        "proteina": None,
        "contenido_agua": None,
        "grasa_subcutanea": None,
        "grasa_visceral": None,
    },
    {
        # Medicion 2 — pesaje con calcetines (sin impedancia, solo metricas base)
        "peso_kg": 80.40,
        "imc": 27.8,
        "grasa_corporal": None,   # impedancia = 0 → no calculable
        "masa_grasa": None,
        "masa_muscular": None,
        "agua_corporal": None,
        "bmr": 1764.0,
        "edad_corporal": None,
        "peso_estandar": 63.6,
        "frecuencia_muscular": None,
        "musculo_esqueletico": None,
        "masa_esqueletica": None,
        "proteina": None,
        "contenido_agua": None,
        "grasa_subcutanea": None,
        "grasa_visceral": None,
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _limpiar_tablas(db) -> None:
    """Elimina todos los datos existentes (dev only). La FK cascade borra mediciones."""
    print("  Limpiando datos anteriores...")
    db.query(Medicion).delete()
    db.query(Perfil).delete()
    db.commit()
    print("  Tablas vaciadas.")


def _crear_perfil(db) -> Perfil:
    """Inserta el perfil de prueba y lo retorna."""
    perfil = Perfil(**PERFIL_SEED)
    db.add(perfil)
    db.flush()   # Obtiene el id asignado sin hacer commit aun
    print(f"  Perfil creado: id={perfil.id} | {perfil.nombre} | {perfil.edad} anos | {perfil.estatura_cm} cm | {perfil.genero}")
    return perfil


def _crear_mediciones(db, perfil: Perfil) -> None:
    """Inserta las mediciones de prueba vinculadas al perfil."""
    for i, datos in enumerate(MEDICIONES_SEED, start=1):
        medicion = Medicion(perfil_id=perfil.id, **datos)
        db.add(medicion)
        db.flush()
        bia_ok = "BIA completa" if datos.get("grasa_corporal") is not None else "Solo metricas base (sin impedancia)"
        print(f"  Medicion {i} creada: id={medicion.id} | {datos['peso_kg']} kg | IMC {datos['imc']} | {bia_ok}")


# ── Runner principal ──────────────────────────────────────────────────────────

def run_seed() -> None:
    print()
    print("=" * 60)
    print("  SEED DATA — Femmto Scale App (dev)")
    print("=" * 60)

    db = SessionLocal()
    try:
        # 1. Limpiar datos previos
        _limpiar_tablas(db)

        # 2. Crear perfil
        print("\nInsertando perfil...")
        perfil = _crear_perfil(db)

        # 3. Crear mediciones
        print("\nInsertando mediciones...")
        _crear_mediciones(db, perfil)

        # 4. Confirmar transaccion
        db.commit()
        print()
        print("=" * 60)
        print("  [OK] Seed completado exitosamente.")
        print(f"  Perfil id={perfil.id} con {len(MEDICIONES_SEED)} medicion(es) guardadas.")
        print("=" * 60)
        print()

    except SQLAlchemyError as e:
        db.rollback()
        print()
        print("[ERROR] Fallo en la base de datos. Se revirtio la transaccion.")
        print(f"Detalle: {e}")
        raise

    except Exception as e:
        db.rollback()
        print()
        print("[ERROR] Error inesperado durante el seed.")
        print(f"Detalle: {e}")
        raise

    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
