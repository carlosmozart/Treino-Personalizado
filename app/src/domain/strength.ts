// Força: 1RM estimado (M3) e recordes por 1RM, carga e volume (M4).
// O recorde antigo era "maior carga": 100 kg × 1 vencia 95 kg × 8, que é uma série mais forte.
import type { Workout, WorkoutEntry, WorkoutSet } from './model';
import { entryVolume, sessionsOf, workSets } from './workouts';

/** Acima disso a estimativa fica pouco confiável e não é usada. */
export const MAX_E1RM_REPS = 12;

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 1RM estimado pela fórmula de Epley; 1 repetição é a própria carga. Null acima de 12 reps. */
export function e1rm(weight: number, reps: number): number | null {
  if (!(weight > 0) || !(reps >= 1) || reps > MAX_E1RM_REPS) return null;
  return reps === 1 ? weight : round1(weight * (1 + reps / 30));
}

/** Carga equivalente para outro número de repetições (calculadora). */
export function weightForReps(oneRm: number, reps: number): number {
  return reps <= 1 ? oneRm : round1(oneRm / (1 + reps / 30));
}

export function bestE1rm(entry: WorkoutEntry): { value: number; set: WorkoutSet } | null {
  let best: { value: number; set: WorkoutSet } | null = null;
  for (const set of workSets(entry)) {
    const v = e1rm(set.weight, set.reps);
    if (v !== null && (!best || v > best.value)) best = { value: v, set };
  }
  return best;
}

export type RecordKind = 'e1rm' | 'weight' | 'volume';

const maxWeight = (entry: WorkoutEntry) => Math.max(0, ...workSets(entry).map(s => s.weight));

/**
 * Recordes da entrada frente às sessões ANTERIORES (por data; a primeira não conta; treino
 * lançado depois com data antiga só compete com o que veio antes dele).
 */
export function recordKinds(workouts: readonly Workout[], workout: Workout, entry: WorkoutEntry): RecordKind[] {
  if (entry.mode === 'cardio' || !workSets(entry).length) return [];
  const previous = sessionsOf(workouts, entry.key).filter(s => s.workout.date < workout.date && s.workout.id !== workout.id);
  if (!previous.length) return [];
  const prevE1rm = Math.max(0, ...previous.map(s => bestE1rm(s.entry)?.value ?? 0));
  const prevWeight = Math.max(0, ...previous.map(s => maxWeight(s.entry)));
  const prevVolume = Math.max(0, ...previous.map(s => entryVolume(s.entry)));
  const kinds: RecordKind[] = [];
  const cur = bestE1rm(entry)?.value ?? 0;
  if (cur > prevE1rm && prevE1rm > 0) kinds.push('e1rm');
  if (maxWeight(entry) > prevWeight && prevWeight > 0) kinds.push('weight');
  if (entryVolume(entry) > prevVolume && prevVolume > 0) kinds.push('volume');
  return kinds;
}

export const RECORD_LABEL: Record<RecordKind, string> = { e1rm: '1RM', weight: 'Carga', volume: 'Volume' };
