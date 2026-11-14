// W8: recorde na hora em que a série é marcada, e quanto falta antes dela. A base é o histórico do
// exercício antes deste treino mais as séries já feitas nele (a mesma série duas vezes não vale
// dois troféus). Como nos recordes do histórico (M4), o primeiro treino de um exercício não conta.
import type { ExerciseMode, Workout } from './model';
import { e1rm } from './strength';
import { sessionsOf, workSets } from './workouts';

export interface Bests {
  /** Maior carga já feita. */
  weight: number;
  /** Mais repetições em cada carga. */
  repsAt: Map<number, number>;
  /** Melhor 1RM estimado. */
  e1rm: number;
}

export type RecordKind = 'carga' | 'reps' | 'e1rm';

const RECORD_LABEL: Record<RecordKind, string> = {
  carga: 'maior carga',
  reps: 'mais repetições nesta carga',
  e1rm: 'melhor 1RM estimado'
};

export const recordLabel = (kinds: readonly RecordKind[]) => kinds.map(k => RECORD_LABEL[k]).join(', ');

type SetLike = { reps: number; weight: number; kind: 'work' | 'warmup'; done?: boolean };

/**
 * Os melhores números do exercício antes desta sessão (por data, e no mesmo dia, antes do início)
 * somados às séries de trabalho já feitas nela. Null sem histórico: o primeiro treino não tem
 * recorde.
 */
export function bestsBefore(workouts: readonly Workout[], key: string, session: { id: string; date: string; startedAt?: string }, doneHere: readonly SetLike[] = []): Bests | null {
  const before = sessionsOf(workouts, key).filter(({ workout: w }) => w.id !== session.id
    && (w.date < session.date || (w.date === session.date && !!w.startedAt && !!session.startedAt && w.startedAt < session.startedAt)));
  if (!before.length) return null;
  const b: Bests = { weight: 0, repsAt: new Map(), e1rm: 0 };
  const add = (s: { reps: number; weight: number }) => {
    b.weight = Math.max(b.weight, s.weight);
    b.repsAt.set(s.weight, Math.max(b.repsAt.get(s.weight) ?? 0, s.reps));
    b.e1rm = Math.max(b.e1rm, e1rm(s.weight, s.reps) ?? 0);
  };
  for (const { entry } of before) for (const s of workSets(entry)) add(s);
  for (const s of doneHere) if (s.kind === 'work' && s.done) add(s);
  return b;
}

/** Os recordes que uma série bate (só séries de trabalho por repetições, com carga ou sem). */
export function setRecords(set: SetLike, bests: Bests | null, mode: ExerciseMode): RecordKind[] {
  if (!bests || set.kind !== 'work' || mode !== 'reps' || !(set.reps > 0)) return [];
  const out: RecordKind[] = [];
  if (set.weight > 0 && set.weight > bests.weight) out.push('carga');
  const prevReps = bests.repsAt.get(set.weight);
  if (prevReps !== undefined && set.reps > prevReps) out.push('reps');
  const est = e1rm(set.weight, set.reps);
  if (est !== null && bests.e1rm > 0 && est > bests.e1rm) out.push('e1rm');
  return out;
}

/**
 * Antes da série: quanto falta. "Recorde de repetições com 60 kg se fizer 11" quando a carga já
 * foi feita; senão, quanto do melhor 1RM a série planejada representa (de 90% para cima).
 */
export function recordHint(set: SetLike, bests: Bests | null, mode: ExerciseMode): string | null {
  if (!bests || set.kind !== 'work' || mode !== 'reps' || set.done) return null;
  const kg = (n: number) => String(n).replace('.', ',');
  if (set.weight > 0 && set.weight > bests.weight) return `${kg(set.weight)} kg é a sua maior carga: recorde ao fazer a série.`;
  const prevReps = bests.repsAt.get(set.weight);
  if (prevReps !== undefined) {
    const need = prevReps + 1 - set.reps;
    if (need <= 0) return `Recorde de repetições com ${kg(set.weight)} kg nesta série.`;
    if (need <= 3) return `${need === 1 ? 'Falta 1 repetição' : `Faltam ${need} repetições`} para o recorde com ${kg(set.weight)} kg (${prevReps + 1}).`;
  }
  const est = e1rm(set.weight, set.reps);
  if (est !== null && bests.e1rm > 0) {
    const pct = Math.round((est / bests.e1rm) * 100);
    if (pct >= 90 && pct < 100) return `${pct}% do seu melhor 1RM estimado.`;
    if (pct >= 100 && est > bests.e1rm) return 'Esta série bate o seu melhor 1RM estimado.';
  }
  return null;
}

/** Soma uma série feita aos melhores números (cópia). */
function withSet(b: Bests, s: { reps: number; weight: number }): Bests {
  const repsAt = new Map(b.repsAt);
  repsAt.set(s.weight, Math.max(repsAt.get(s.weight) ?? 0, s.reps));
  return { weight: Math.max(b.weight, s.weight), repsAt, e1rm: Math.max(b.e1rm, e1rm(s.weight, s.reps) ?? 0) };
}

/**
 * Os recordes de cada série do exercício neste treino, na ordem: cada série feita é comparada com
 * o histórico mais as séries feitas antes dela. Devolve também os números depois de todas (para a
 * dica da próxima série).
 */
export function trophiesFor(sets: readonly SetLike[], base: Bests | null, mode: ExerciseMode): { kinds: RecordKind[][]; after: Bests | null } {
  let running = base;
  const kinds = sets.map(s => {
    if (!running || !s.done || s.kind !== 'work') return [];
    const k = setRecords(s, running, mode);
    running = withSet(running, s);
    return k;
  });
  return { kinds, after: running };
}
