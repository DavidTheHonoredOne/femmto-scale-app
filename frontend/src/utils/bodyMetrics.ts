/**
 * bodyMetrics.ts
 * Port TypeScript of backend/bluetooth/algorithms.py  (BodyMetricsCalculator)
 *
 * Calibrated with 2-point FitDays Ground Truth:
 *   Point A: 80.40 kg, 170 cm, 515 Ω  → FFM 59.6 kg, muscle 57.3 kg
 *   Point B: 80.10 kg, 170 cm, 512 Ω  → FFM 59.5 kg, muscle 57.3 kg
 *
 * All formulas match the Python implementation exactly —
 * parameters are fully dynamic (no hardcoded profile values).
 */

export type Gender = 'M' | 'F';

export interface UserProfile {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: Gender;
}

export interface BodyMetrics {
  // Base (always present)
  weightKg: number;
  bmi: number;
  standardWeightKg: number;
  bmrKcal: number;

  // BIA-derived (null when impedance === 0)
  biaError: boolean;
  fatPercent: number | null;
  fatMassKg: number | null;
  muscleMassKg: number | null;
  waterPercent: number | null;
  bodyAge: number | null;

  // Extra info
  impedanceOhms: number;
}

/**
 * Calculate all body composition metrics.
 *
 * @param profile  User profile (weight, height, age, gender)
 * @param impedanceOhms  Bioelectrical impedance in Ohms extracted from the BLE packet.
 *                       Pass 0 if not available (shoes/socks, sensor failure).
 */
export function calculateMetrics(
  profile: UserProfile,
  impedanceOhms: number
): BodyMetrics {
  const { weightKg, heightCm, ageYears, gender } = profile;
  const heightM = heightCm / 100;
  const isMale = gender === 'M';

  // ── Base metrics ──────────────────────────────────────────────
  const bmi = weightKg / (heightM ** 2);
  const standardWeightKg = 22.0 * (heightM ** 2);

  // BMR — Mifflin-St Jeor (offset calibrated vs FitDays: -7 men, -173 women)
  const bmrKcal = isMale
    ? (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) - 7
    : (10 * weightKg) + (6.25 * heightCm) - (5 * ageYears) - 173;

  const base = {
    weightKg: Math.round(weightKg * 100) / 100,
    bmi: Math.round(bmi * 10) / 10,
    standardWeightKg: Math.round(standardWeightKg * 10) / 10,
    bmrKcal: Math.round(bmrKcal),
    impedanceOhms,
  };

  // ── BIA edge-case: no impedance ───────────────────────────────
  if (impedanceOhms <= 0) {
    return {
      ...base,
      biaError: true,
      fatPercent: null,
      fatMassKg: null,
      muscleMassKg: null,
      waterPercent: null,
      bodyAge: null,
    };
  }

  // ── BIA cascade (2-point calibration vs FitDays) ─────────────
  const h2z = (heightCm ** 2) / impedanceOhms;   // Height² / Impedance — BIA core factor

  // Fat-Free Mass (FFM) — calibrated linear equation
  let ffmKg = isMale
    ? (0.414 * h2z) + (0.25 * weightKg) + 16.26
    : (0.380 * h2z) + (0.22 * weightKg) + 14.0;

  // Physiological safety clamp
  if (ffmKg > weightKg) ffmKg = weightKg * 0.95;

  const fatMassKg  = weightKg - ffmKg;
  const fatPercent = (fatMassKg / weightKg) * 100;

  // Muscle mass — calibrated independently against FitDays (not derived from FFM)
  const rawMuscle = isMale
    ? (0.091 * h2z) + (0.20 * weightKg) + 36.12
    : (0.085 * h2z) + (0.18 * weightKg) + 32.0;

  const muscleMassKg = Math.min(ffmKg * 0.98, Math.max(ffmKg * 0.80, rawMuscle));

  // Water — Pace & Rathbun constant calibrated at 71.6% (vs FitDays)
  const waterKg      = ffmKg * 0.716;
  const waterPercent = (waterKg / weightKg) * 100;

  // Body age — deviation from ideal body fat % (15% male / 22% female)
  const bfIdeal = isMale ? 15.0 : 22.0;
  const bodyAge = Math.round(ageYears + (fatPercent - bfIdeal) / 5.0);

  return {
    ...base,
    biaError: false,
    fatPercent:    Math.round(fatPercent    * 10) / 10,
    fatMassKg:     Math.round(fatMassKg     * 10) / 10,
    muscleMassKg:  Math.round(muscleMassKg  * 10) / 10,
    waterPercent:  Math.round(waterPercent  * 10) / 10,
    bodyAge,
  };
}
