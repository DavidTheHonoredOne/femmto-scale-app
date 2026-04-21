import type { Profile } from '../services/api';

export type HealthStatus = 'low' | 'normal' | 'high' | 'attention';

export interface HealthRangeResult {
  status: HealthStatus;
  min: number;
  max: number;
  value: number;
  progressPct: number;
  recommendation: string;
}

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// Nota: se necesita el peso base para algunas fórmulas como el BMR si se quiere exacto y el agua.
// Como el evaluateMetric se invoca métrica por métrica, no tenemos acceso a todas por defecto,
// pero pasamos "value" como el valor actual.
// Para el BMR y el Agua, lo ideal sería tener el Peso actual.
// Asumiremos que el evaluateMetric funciona con "value" = valor de esa métrica.
// Para BMR o Agua, dado que value YA es el resultado (%), el rango min/max estricto no requiere el peso exacto para el gráfico (ya que evaluamos %, no la variable).
// Sin embargo, para recalcular `expected_bmr` sin el peso corporal es imposible.
// Pero wait, la regresión Mifflin-St Jeor = (10 * peso_kg) + ...
// ¿Cómo hago si `value` es el `bmr_kcal` (resultado final)?
// No puedo hallar el peso_kg. Voy a tener que modificar evaluateMetric para que acepte TODO el obj de medición.

export const evaluateMetricWithWeight = (metricKey: string, value: number, profile: Profile, peso_kg: number): HealthRangeResult | null => {
  if (value == null || isNaN(value)) return null;

  const { edad, estatura_cm, genero } = profile;
  const isMale = genero.toLowerCase() === 'masculino';
  const heightM = estatura_cm / 100;

  switch (metricKey) {
    case 'peso_kg': {
      const min = 18.5 * (heightM * heightM);
      const max = 24.9 * (heightM * heightM);
      let status: HealthStatus = 'normal';
      let rec = 'Tu peso está dentro del rango saludable.';
      if (value < min) { status = 'low'; rec = 'Tu peso está por debajo del rango saludable.'; }
      else if (value > max) { status = 'high'; rec = 'Tu peso está por encima del rango saludable.'; }
      
      const rangeSpan = (max - min) || 1;
      const progressPct = clamp(((value - min) / rangeSpan) * 50 + 25, 5, 95);
      return { status, min, max, value, progressPct, recommendation: rec };
    }

    case 'imc': {
      const min = 18.5;
      const max = 24.9;
      let status: HealthStatus = 'normal';
      let rec = 'Tu índice de masa corporal es óptimo.';
      if (value < min) { status = 'low'; rec = 'IMC bajo.'; }
      else if (value > max) { status = 'high'; rec = 'IMC elevado.'; }

      const rangeSpan = (max - min) || 1;
      const progressPct = clamp(((value - min) / rangeSpan) * 50 + 25, 5, 95);
      return { status, min, max, value, progressPct, recommendation: rec };
    }

    case 'grasa_corporal_pct': {
      const min = isMale ? 10 : 18;
      const max = isMale ? 20 : 28;
      let status: HealthStatus = 'normal';
      let rec = 'Tu porcentaje de grasa es saludable.';
      if (value < min) { status = 'low'; rec = 'Grasa corporal por debajo del promedio saludable a no ser que seas atleta.'; }
      else if (value > max) { status = 'high'; rec = 'Grasa corporal elevada. Recomendable revisión.'; }

      const rangeSpan = max - min;
      const progressPct = clamp(((value - min) / rangeSpan) * 50 + 25, 5, 95);
      return { status, min, max, value, progressPct, recommendation: rec };
    }

    case 'masa_muscular_kg': {
      const min = isMale ? 40 : 30;
      const max = isMale ? 50 : 40;
      let status: HealthStatus = 'normal';
      let rec = 'Tu masa muscular está en rangos regulares.';
      if (value < min) { status = 'low'; rec = 'Masa muscular baja. Considera entrenamiento de fuerza.'; }
      else if (value > max) { status = 'high'; rec = 'Posees una masa muscular superior al promedio.'; }

      const rangeSpan = max - min;
      const progressPct = clamp(((value - min) / rangeSpan) * 50 + 25, 5, 95);
      return { status, min, max, value, progressPct, recommendation: rec };
    }

    case 'agua_corporal_pct': {
      // Watson logic for percentage ranges
      let expectedPct = 0;
      if (isMale) {
        const liters = 2.447 - (0.09145 * edad) + (0.1074 * profile.estatura_cm) + (0.3362 * peso_kg);
        expectedPct = (liters / peso_kg) * 100;
      } else {
        const liters = -2.097 + (0.1069 * profile.estatura_cm) + (0.2466 * peso_kg);
        expectedPct = (liters / peso_kg) * 100;
      }

      const min = isMale ? 50 : 45;
      const max = isMale ? 65 : 60;
      let status: HealthStatus = 'normal';
      let rec = `Tu hidratación está en niveles óptimos. El estándar de Watson calcula ~${expectedPct.toFixed(1)}%.`;
      
      if (value < min) { status = 'low'; rec = 'Nivel bajo de agua corporal. Procura hidratarte más.'; }
      else if (value > max) { status = 'high'; rec = 'Nivel alto de agua corporal.'; }

      const rangeSpan = max - min;
      const progressPct = clamp(((value - min) / rangeSpan) * 50 + 25, 5, 95);
      return { status, min, max, value, progressPct, recommendation: rec };
    }

    case 'bmr_kcal': {
      // Mifflin-St Jeor strict equation
      const S = isMale ? 5 : -161;
      const expected = (10 * peso_kg) + (6.25 * profile.estatura_cm) - (5 * edad) + S;
      const min = expected - 100;
      const max = expected + 100;
      let status: HealthStatus = 'normal';
      let rec = 'Tasa Metabólica Basal normal para tu composición.';
      
      if (value < min) { status = 'low'; rec = 'Tasa Metabólica por debajo de lo esperado.'; }
      else if (value > max) { status = 'high'; rec = 'Tasa Metabólica superior al estándar esperado.'; }

      const rangeSpan = (max - min) || 1;
      const progressPct = clamp(((value - min) / rangeSpan) * 50 + 25, 5, 95);

      return { status, min: Math.max(expected - 300, 1000), max: expected + 300, value, progressPct, recommendation: rec };
    }

    case 'edad_corporal': {
      const realAge = profile.edad;
      let status: HealthStatus = 'normal';
      let rec = 'Tu edad corporal es excelente.';
      let progressPct = 25; 
      
      if (value > realAge) {
        if (value <= realAge + 3) {
          status = 'attention';
          rec = 'Atención: Tu edad corporal es ligeramente mayor que la real.';
          progressPct = 60;
        } else {
          status = 'high';
          rec = 'Advertencia: Edad corporal significativamente más alta que tu edad biológica.';
          progressPct = 90;
        }
      } else {
        progressPct = clamp(25 - ((realAge - value) * 2), 5, 25);
      }

      return { status, min: realAge - 10, max: realAge + 10, value, progressPct, recommendation: rec };
    }

    case 'peso_estandar_kg': {
      // 20.8 * height^2
      const min = 18.5 * (heightM * heightM);
      const max = 24.9 * (heightM * heightM);
      
      let status: HealthStatus = 'normal';
      if (value < min) status = 'low';
      else if (value > max) status = 'high';

      const rangeSpan = (max - min) || 1;
      const progressPct = clamp(((value - min) / rangeSpan) * 50 + 25, 5, 95);

      return { status, min, max, value, progressPct, recommendation: 'Peso ideal teórico basado en un IMC de 20.8' };
    }

    case 'grasa_visceral': {
      const min = 1;
      const max = 20; // limit logic arbitrarily 20 max graph
      let status: HealthStatus = 'normal';
      let rec = 'Nivel de grasa visceral saludable (bajo riesgo).';
      let progressPct = 25;
      
      if (value <= 9) {
        status = 'normal';
        progressPct = clamp(((value - 1) / 8) * 33, 5, 33);
      } else if (value <= 14) {
        status = 'attention';
        rec = 'Moderado. Presta atención a tu nivel de grasa visceral.';
        progressPct = clamp(33 + ((value - 9) / 5) * 33, 34, 66);
      } else {
        status = 'high';
        rec = 'Nivel Alto de riesgo. Trabaja en reducir tu grasa visceral.';
        progressPct = clamp(66 + ((value - 14) / 6) * 33, 67, 95);
      }

      return { status, min, max, value, progressPct, recommendation: rec };
    }

    default:
      return null;
  }
};

// Retro-compatibility fallback
export const evaluateMetric = (metricKey: string, value: number, profile: Profile): HealthRangeResult | null => {
  // If we only pass these, we assume peso = value if missing, or generic fallback.
  // Actually, to use this properly, we should refactor `DashboardPage` and `ProfilesPage` to call evaluateMetricWithWeight.
  // We will just expose evaluateMetricWithWeight.
  return evaluateMetricWithWeight(metricKey, value, profile, value);
};
