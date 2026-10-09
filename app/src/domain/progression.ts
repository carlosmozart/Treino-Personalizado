// Progressão automática de carga (M10–M12). Regras em docs/dev/progressao.md.
// Função pura: a sugestão sai do histórico a cada treino, nada é gravado.
import type { PlanExercise, Workout, WorkoutEntry } from './model';
import { sessionsOf, workSets } from './workouts';

export const DEFAULT_INCREMENT = 2.5;
export const INCREMENTS = [1, 1.25, 2.5, 5] as const;
/** Sessões seguidas na mesma carga, sem evoluir, que pedem deload. */
const STALL_SESSIONS = 3;

export type ProgressionKind = 'first' | 'up' | 'keep' | 'deload';

export interface Progression {
  kind: ProgressionKind;
  weight: number;
  reps: number;
  /** Linha explicando o porquê; vazia na primeira vez. */
  reason: string;
}

type Target = Pick<PlanExercise, 'sets' | 'reps' | 'weight' | 'repMin' | 'repMax' | 'increment'>;

export function repRange(t: Pick<PlanExercise, 'reps' | 'repMin' | 'repMax'>): { min: number; max: number } {
  const min = t.repMin && t.repMin > 0 ? t.repMin : t.reps;
  const max = t.repMax && t.repMax >= min ? t.repMax : Math.max(min, t.reps);
  return { min, max };
}

const kg = (n: number) => `${String(Math.round(n * 10) / 10).replace('.', ',')} kg`;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Carga de referência da sessão (última série de trabalho) e as séries feitas com ela. */
function reference(entry: WorkoutEntry) {
  const sets = workSets(entry);
  const weight = sets.length ? sets[sets.length - 1]!.weight : 0;
  return { weight, sets, atWeight: sets.filter(s => s.weight === weight) };
}

function stalled(history: WorkoutEntry[], weight: number, max: number, planned: number): boolean {
  if (history.length < STALL_SESSIONS) return false;
  const lastN = history.slice(-STALL_SESSIONS).map(reference);
  if (lastN.some(r => r.weight !== weight || r.atWeight.length >= planned && r.atWeight.every(s => s.reps >= max))) return false;
  const total = (r: ReturnType<typeof reference>) => r.atWeight.reduce((n, s) => n + s.reps, 0);
  return total(lastN[lastN.length - 1]!) <= total(lastN[0]!);
}

/**
 * Sugestão para o próximo treino do exercício, a partir das sessões anteriores a `date`.
 * `null` quando não há o que sugerir (cardio, tempo, peso do corpo).
 */
export function suggestProgression(workouts: readonly Workout[], key: string, target: Target, date: string): Progression | null {
  const { min, max } = repRange(target);
  const history = sessionsOf(workouts, key).filter(s => s.workout.date < date).map(s => s.entry).filter(e => workSets(e).length);
  const last = history[history.length - 1];
  if (!last) return target.weight > 0 ? { kind: 'first', weight: target.weight, reps: max, reason: '' } : null;

  const ref = reference(last);
  if (ref.weight <= 0) return null;
  const inc = target.increment && target.increment > 0 ? target.increment : DEFAULT_INCREMENT;
  const planned = Math.max(1, target.sets);

  if (last.aggregated) {
    return { kind: 'keep', weight: ref.weight, reps: max, reason: `Mantém ${kg(ref.weight)}: a última vez é um registro antigo, sem as séries.` };
  }
  if (ref.atWeight.length >= planned && ref.atWeight.every(s => s.reps >= max) && ref.atWeight.some(s => s.failure)) {
    return { kind: 'keep', weight: ref.weight, reps: max, reason: `Mantém ${kg(ref.weight)}: chegou a ${max} reps, mas indo até a falha.` };
  }
  if (ref.atWeight.length >= planned && ref.atWeight.every(s => s.reps >= max)) {
    return { kind: 'up', weight: round1(ref.weight + inc), reps: min, reason: `+${kg(inc)}: ${max} reps nas ${planned} séries.` };
  }
  if (stalled(history, ref.weight, max, planned)) {
    const weight = Math.max(0, Math.floor((ref.weight * 0.9) / inc) * inc);
    return { kind: 'deload', weight: round1(weight), reps: max, reason: `−10%: ${STALL_SESSIONS} treinos sem evoluir com ${kg(ref.weight)}.` };
  }
  if (ref.atWeight.length < planned) {
    return { kind: 'keep', weight: ref.weight, reps: max, reason: `Mantém ${kg(ref.weight)}: ${ref.atWeight.length} de ${planned} séries na última vez.` };
  }
  return {
    kind: 'keep', weight: ref.weight, reps: max,
    reason: `Mantém ${kg(ref.weight)}: busque ${max} reps em todas (última: ${ref.atWeight.map(s => s.reps).join(' · ')}).`
  };
}
