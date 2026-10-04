export const MET_STRENGTH_DEFAULT = 5.0;
export const MET_CARDIO_DEFAULT = 6.0;

export interface LoggedSet {
  reps: number;
  weight: number;
}

/** MET da corrida/caminhada pela velocidade média; sem distância, usa o padrão. */
export function cardioMet(minutes: number, km: number, fallback = MET_CARDIO_DEFAULT): number {
  if (!minutes || !km) return fallback;
  const kmh = km / (minutes / 60);
  if (kmh < 5.5) return 3.5;
  if (kmh < 6.5) return 5.0;
  if (kmh < 8) return 7.0;
  if (kmh < 10) return 9.0;
  if (kmh < 12) return 11.0;
  return 12.5;
}

/**
 * MET da musculação a partir do que foi feito: carga relativa ao peso corporal e densidade
 * (séries por minuto). Mantido entre 4,2 e 6,0 — 3x12 leve e 5x3 pesado não gastam igual,
 * mas nenhuma sessão de força vira corrida.
 */
export function strengthMet(sets: readonly LoggedSet[], bodyWeightKg: number, minutes: number,
  fallback = MET_STRENGTH_DEFAULT): number {
  if (!sets.length) return fallback;
  let reps = 0;
  let volume = 0;
  for (const s of sets) {
    reps += s.reps || 0;
    volume += (s.reps || 0) * (s.weight || 0);
  }
  const relativeLoad = reps && bodyWeightKg ? volume / reps / bodyWeightKg : 0.25;
  const density = minutes ? sets.length / minutes : 0.12;
  return Math.max(4.2, Math.min(6.0, 4.1 + Math.min(1.4, Math.max(0, relativeLoad) * 1.25) + Math.min(0.5, density * 2)));
}

export function kcal(met: number, bodyWeightKg: number, minutes: number): number {
  return met * bodyWeightKg * (minutes / 60);
}
