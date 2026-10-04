// Dados de exemplo para testes (não é importado pelo app).
import { DAY_KEYS, type DayKey } from './ai-plan';
import { emptyAppData, type AppData, type Plan, type PlanDay, type PlanExercise, type Workout } from './model';

export function planExercise(id: string, name: string, extra: Partial<PlanExercise> = {}): PlanExercise {
  return { id, name, mode: 'reps', sets: 3, reps: 10, weight: 20, minutes: 20, km: 0, optional: false, alternatives: [], ...extra };
}

/** Plano de segunda a sábado (domingo de descanso) com os exercícios dados em cada dia. */
export function samplePlan(exercises: (day: DayKey) => PlanExercise[] = () => [planExercise('e1', 'Supino Reto'), planExercise('e2', 'Remada Curvada')]): Plan {
  const days = Object.fromEntries(DAY_KEYS.map(key => [key, {
    name: `Treino ${key}`, focus: '', optional: false, exercises: key === 'DOM' ? [] : exercises(key)
  } satisfies PlanDay])) as Record<DayKey, PlanDay>;
  return { id: 'p1', name: 'Plano', description: '', trainingTime: '', createdAt: '2026-10-01', updatedAt: '2026-10-01', days };
}

export function sampleData(extra: Partial<AppData> = {}): AppData {
  const data = emptyAppData();
  data.plans = { p1: samplePlan() };
  data.activePlanId = 'p1';
  data.profile.weightKg = 80;
  return { ...data, ...extra };
}

export function workout(date: string, name: string, sets: [number, number][], id = `w-${date}-${name}`): Workout {
  return {
    id, date, source: 'app',
    entries: [{ key: name.toLowerCase(), name, mode: 'reps', sets: sets.map(([reps, weight]) => ({ reps, weight, kind: 'work' })) }]
  };
}
