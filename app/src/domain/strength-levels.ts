// W16: recordes por número de repetições, e V9: nível de força nos levantamentos principais.
import type { Sex } from './health';
import type { Workout } from './model';
import { bestE1rm, weightForReps } from './strength';
import { normalizeExerciseName } from './text';
import { sessionsOf, workSets } from './workouts';

export interface RepRecord {
  reps: number;
  /** A maior carga feita em uma série de pelo menos `reps` repetições. */
  weight: number | null;
  date: string | null;
  /** O que o melhor 1RM estimado diz ser possível (para as linhas sem marca). */
  estimate: number | null;
}

/**
 * Recordes de 1 a 12 repetições: a maior carga feita em uma série com pelo menos aquelas
 * repetições (8 × 80 kg também vale como 6 × 80). Sem marca, a estimativa pelo melhor 1RM.
 */
export function repRecords(workouts: readonly Workout[], key: string): RepRecord[] {
  const sets = sessionsOf(workouts, key).flatMap(({ workout, entry }) => workSets(entry).filter(s => s.weight > 0 && s.reps > 0).map(s => ({ ...s, date: workout.date })));
  if (!sets.length) return [];
  let best = 0;
  for (const { entry } of sessionsOf(workouts, key)) best = Math.max(best, bestE1rm(entry)?.value ?? 0);
  return Array.from({ length: 12 }, (_, i) => {
    const reps = i + 1;
    const top = sets.filter(s => s.reps >= reps).reduce<(typeof sets)[number] | null>((m, s) => (!m || s.weight > m.weight ? s : m), null);
    return { reps, weight: top?.weight ?? null, date: top?.date ?? null, estimate: best > 0 ? weightForReps(best, reps) : null };
  });
}

export type Lift = 'supino' | 'agachamento' | 'terra' | 'desenvolvimento' | 'remada';
export const LEVELS = ['Iniciante', 'Novato', 'Intermediário', 'Avançado', 'Elite'] as const;
export type StrengthLevel = (typeof LEVELS)[number];

/**
 * 1RM ÷ peso do corpo onde cada nível começa (Novato, Intermediário, Avançado, Elite), para
 * adultos. Referências gerais de força em barra livre; valem como ordem de grandeza.
 */
const STANDARDS: Record<Lift, { m: number[]; f: number[] }> = {
  supino: { m: [0.75, 1.0, 1.5, 2.0], f: [0.5, 0.75, 1.0, 1.4] },
  agachamento: { m: [1.0, 1.5, 2.0, 2.5], f: [0.75, 1.0, 1.5, 2.0] },
  terra: { m: [1.25, 1.75, 2.5, 3.0], f: [1.0, 1.25, 1.75, 2.5] },
  desenvolvimento: { m: [0.5, 0.75, 1.0, 1.4], f: [0.35, 0.5, 0.75, 1.0] },
  remada: { m: [0.65, 0.9, 1.2, 1.5], f: [0.45, 0.65, 0.9, 1.1] }
};

/** O levantamento principal (com barra) pelo nome; os outros exercícios não têm nível. */
export function liftOf(name: string): Lift | null {
  const n = normalizeExerciseName(name);
  if (/halter|maquina|smith|polia|articulad|inclinad|declinad|unilateral/.test(n)) return null;
  if (/^supino reto\b/.test(n)) return 'supino';
  if (/^agachamento (livre|\(barra\))|^agachamento$/.test(n)) return 'agachamento';
  if (/levantamento terra|^terra\b/.test(n) && !/romeno|stiff|sumo/.test(n)) return 'terra';
  if (/^desenvolvimento( militar)?( \(barra\)| com barra)?$|^desenvolvimento militar/.test(n)) return 'desenvolvimento';
  if (/^remada curvada/.test(n)) return 'remada';
  return null;
}

export interface LevelView {
  level: StrengthLevel;
  /** 1RM ÷ peso do corpo. */
  ratio: number;
  next: { level: StrengthLevel; kg: number } | null;
}

/** Nível de força pelo 1RM estimado e o peso do corpo (sexo vazio usa a referência masculina). */
export function strengthLevel(lift: Lift, oneRm: number, bodyKg: number, sex: Sex): LevelView | null {
  if (!(oneRm > 0) || !(bodyKg > 0)) return null;
  const marks = STANDARDS[lift][sex === 'feminino' ? 'f' : 'm'];
  const ratio = oneRm / bodyKg;
  const i = marks.filter(m => ratio >= m).length;
  const nextMark = marks[i];
  return {
    level: LEVELS[i]!,
    ratio: Math.round(ratio * 100) / 100,
    next: nextMark === undefined ? null : { level: LEVELS[i + 1]!, kg: Math.ceil((nextMark * bodyKg) / 2.5) * 2.5 }
  };
}
