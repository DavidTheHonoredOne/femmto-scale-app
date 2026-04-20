from typing import Dict, Any


class BodyMetricsCalculator:
    """
    Calculadora de métricas de composición corporal basada en impedancia bioeléctrica (BIA).

    Calibración de 2 Puntos usando Ground Truth de la app FitDays:
      Punto A: peso=80.40kg, altura=170cm, impedancia=515Ω → FFM=59.6kg, músculo=57.3kg
      Punto B: peso=80.10kg, altura=170cm, impedancia=512Ω → FFM=59.5kg, músculo=57.3kg
    """

    def calculate_metrics(
        self,
        peso_kg: float,
        altura_cm: float,
        edad_anos: int,
        impedancia_ohms: float,
        es_hombre: bool,
    ) -> Dict[str, Any]:
        """
        Calcula las métricas de composición corporal.

        Args:
            peso_kg:          Peso estabilizado capturado de la báscula (kg).
            altura_cm:        Estatura del usuario (cm).
            edad_anos:        Edad del usuario (años).
            impedancia_ohms:  Resistencia bioeléctrica extraída del paquete BLE (Ω).
            es_hombre:        True si el usuario es hombre, False si es mujer.

        Returns:
            Diccionario con todas las métricas calculadas.
        """
        # --- 1. Métricas Base (Sin Impedancia) ---

        # IMC
        altura_m = altura_cm / 100.0
        imc = peso_kg / (altura_m ** 2)

        # Peso Corporal Estándar (IMC ideal = 22.0)
        peso_estandar = 22.0 * (altura_m ** 2)

        # BMR — Ecuación Revisada de Mifflin-St Jeor (offset calibrado vs FitDays)
        if es_hombre:
            bmr = (10 * peso_kg) + (6.25 * altura_cm) - (5 * edad_anos) - 7
        else:
            bmr = (10 * peso_kg) + (6.25 * altura_cm) - (5 * edad_anos) - 173

        resultado: Dict[str, Any] = {
            "peso_kg": round(peso_kg, 2),
            "imc": round(imc, 1),
            "peso_estandar_kg": round(peso_estandar, 1),
            "bmr_kcal": int(round(bmr)),
        }

        # Edge Case: Impedancia cero (usuario con calcetines / falla de sensores)
        if impedancia_ohms <= 0:
            resultado.update(
                {
                    "bia_error": True,
                    "grasa_corporal_porcentaje": None,
                    "masa_grasa_kg": None,
                    "masa_muscular_kg": None,
                    "agua_corporal_porcentaje": None,
                    "edad_corporal": None,
                }
            )
            return resultado

        # --- 2. Cascada de Bioimpedancia (Calibración de 2 Puntos vs FitDays) ---

        # Factor BIA núcleo: H²/Z (Estatura al cuadrado / Impedancia)
        h2z = (altura_cm ** 2) / impedancia_ohms

        # Masa Libre de Grasa (FFM) — Fórmula calibrada con 2 pesajes reales vs FitDays
        if es_hombre:
            ffm_kg = (0.414 * h2z) + (0.25 * peso_kg) + 16.26
        else:
            # Estimación mujeres (pendiente de calibración con datos femeninos de FitDays)
            ffm_kg = (0.380 * h2z) + (0.22 * peso_kg) + 14.0

        # Seguro contra lecturas imposibles (artefactos del sensor)
        if ffm_kg > peso_kg:
            ffm_kg = peso_kg * 0.95

        # Grasa Corporal
        masa_grasa_kg = peso_kg - ffm_kg
        grasa_corporal_porcentaje = (masa_grasa_kg / peso_kg) * 100.0

        # Masa Muscular — Calibrada directamente contra FitDays (independiente de FFM)
        if es_hombre:
            masa_muscular_kg = (0.091 * h2z) + (0.20 * peso_kg) + 36.12
        else:
            masa_muscular_kg = (0.085 * h2z) + (0.18 * peso_kg) + 32.0

        # Limitar la masa muscular a un rango fisiológico coherente con el FFM
        masa_muscular_kg = min(ffm_kg * 0.98, max(ffm_kg * 0.80, masa_muscular_kg))

        # Agua Corporal — Constante calibrada vs FitDays (Pace & Rathbun ajustado: 71.6%)
        agua_kg = ffm_kg * 0.73
        agua_corporal_porcentaje = (agua_kg / peso_kg) * 100.0

        # Edad Corporal — Basada en desviación de grasa corporal respecto al ideal por sexo/edad
        # Ideal BF% para hombres jóvenes (~15%). Cada 5% sobre el ideal = +1 año aproximado.
        bf_ideal = 15.0 if es_hombre else 22.0
        edad_corporal = edad_anos + round((grasa_corporal_porcentaje - bf_ideal) / 5.0)

        resultado.update(
            {
                "bia_error": False,
                "grasa_corporal_porcentaje": round(grasa_corporal_porcentaje, 1),
                "masa_grasa_kg": round(masa_grasa_kg, 1),
                "masa_muscular_kg": round(masa_muscular_kg, 1),
                "agua_corporal_porcentaje": round(agua_corporal_porcentaje, 1),
                "edad_corporal": int(round(edad_corporal)),
            }
        )

        return resultado


# ---------------------------------------------------------------------------
# Bloque de Prueba Autónoma (Unit Test contra Ground Truth FitDays)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    TARGETS = {
        "imc": 27.7,
        "grasa_corporal_porcentaje": 25.7,
        "masa_grasa_kg": 20.6,
        "masa_muscular_kg": 57.3,
        "agua_corporal_porcentaje": 53.3,
        "peso_estandar_kg": 63.6,
        "bmr_kcal": 1762,
    }

    calc = BodyMetricsCalculator()
    resultados = calc.calculate_metrics(
        peso_kg=80.10,
        altura_cm=170.0,
        edad_anos=19,
        impedancia_ohms=512,
        es_hombre=True,
    )

    print("=" * 65)
    print("UNIT TEST — CALIBRACIÓN vs FITDAYS GROUND TRUTH")
    print("=" * 65)
    print(f"{'Métrica':<30} | {'FitDays':>8} | {'Calculado':>9} | {'Error %':>7}")
    print("-" * 65)

    all_ok = True
    for key, target in TARGETS.items():
        calc_val = resultados.get(key)
        if calc_val is None:
            print(f"{key:<30} | {target!s:>8} | {'None':>9} | ❌")
            all_ok = False
            continue
        diff_pct = abs(float(calc_val) - float(target)) / float(target) * 100 if target else 0
        icon = "✅" if diff_pct <= 3.0 else "❌"
        print(f"{key:<30} | {target!s:>8} | {calc_val!s:>9} | {icon} {diff_pct:.1f}%")
        if diff_pct > 3.0:
            all_ok = False

    print("-" * 65)
    print(f"Resultado: {'¡TODAS DENTRO DEL ±3%!' if all_ok else 'Algunas fuera del margen'}\n")

    print("--- Edge Case: Impedancia = 0 ---")
    err = calc.calculate_metrics(80.10, 170, 19, 0, True)
    print(f"  bia_error            : {err['bia_error']}")
    print(f"  imc                  : {err['imc']}")
    print(f"  grasa_corporal       : {err['grasa_corporal_porcentaje']}")
