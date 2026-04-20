export function calculateMetrics(weight, profile, impedance = null) {
  const { height, age, gender } = profile
  const heightM = height / 100

  const bmi = +(weight / heightM ** 2).toFixed(1)
  const standardWeight = +(22.0 * heightM ** 2).toFixed(1)

  let bodyFat
  if (impedance && impedance > 0) {
    const lbm =
      gender === 'male'
        ? 0.407 * weight + 0.267 * height - 19.2
        : 0.252 * weight + 0.473 * height - 48.3
    bodyFat = +Math.max(5, Math.min(50, ((weight - lbm) / weight) * 100)).toFixed(1)
  } else {
    bodyFat = +Math.max(
      5,
      1.2 * bmi + 0.23 * age - 10.8 * (gender === 'male' ? 1 : 0) - 5.4
    ).toFixed(1)
  }

  const fatMass = +(weight * (bodyFat / 100)).toFixed(1)
  const muscleMass = +(weight * (1 - bodyFat / 100) * 0.85).toFixed(1)
  const skeletalMuscle = +((muscleMass / weight) * 100 * 0.6).toFixed(1)
  const skeletalMass = +(weight * 0.042).toFixed(1)
  const subcutaneousFat = +(bodyFat * 0.8).toFixed(1)
  const protein = +((muscleMass * 0.22 / weight) * 100).toFixed(1)

  let bodyWaterL
  if (gender === 'male') {
    bodyWaterL = 2.447 - 0.09156 * age + 0.1074 * height + 0.3362 * weight
  } else {
    bodyWaterL = -2.097 + 0.1069 * height + 0.2466 * weight
  }
  const bodyWater = +Math.min(75, (bodyWaterL / weight) * 100).toFixed(1)

  const visceral = +Math.max(
    1,
    Math.min(59, ((bmi * age) / 450) * (gender === 'male' ? 1.3 : 1.0))
  ).toFixed(0)

  const bmr =
    gender === 'male'
      ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
      : Math.round(10 * weight + 6.25 * height - 5 * age - 161)

  const idealBF = gender === 'male' ? 15 + age * 0.1 : 25 + age * 0.1
  const bodyAge = Math.max(10, Math.round(age + (bodyFat - idealBF) * 0.5))

  const targetFatMass = standardWeight * (gender === 'male' ? 0.15 : 0.22)
  const fatLoss = +Math.max(0, fatMass - targetFatMass).toFixed(1)

  const muscleFrequency = impedance ? +(impedance / 100).toFixed(1) : null

  return {
    weight: +weight.toFixed(1),
    bmi,
    body_fat: bodyFat,
    muscle_mass: muscleMass,
    skeletal_muscle: skeletalMuscle,
    visceral_fat: Number(visceral),
    subcutaneous_fat: subcutaneousFat,
    protein,
    body_water: bodyWater,
    bmr,
    body_age: bodyAge,
    standard_weight: standardWeight,
    fat_mass: fatMass,
    fat_loss: fatLoss,
    muscle_frequency: muscleFrequency,
    skeletal_mass: skeletalMass,
  }
}

export function getMetricStatus(metricKey, value, gender) {
  const ranges = {
    bmi: { normal: [18.5, 24.9], warning: [17, 27.9] },
    body_fat:
      gender === 'male'
        ? { normal: [10, 20], warning: [6, 25] }
        : { normal: [20, 30], warning: [16, 35] },
    visceral_fat: { normal: [1, 9], warning: [1, 14] },
    body_water:
      gender === 'male'
        ? { normal: [50, 65], warning: [45, 70] }
        : { normal: [45, 60], warning: [40, 65] },
  }

  const range = ranges[metricKey]
  if (!range) return 'normal'

  if (value >= range.normal[0] && value <= range.normal[1]) return 'normal'
  if (value >= range.warning[0] && value <= range.warning[1]) return 'warning'
  return 'danger'
}
