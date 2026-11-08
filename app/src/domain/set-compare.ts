// V1: cada série contra a mesma série da última vez (↑ = ↓). Carga primeiro, depois repetições; se
// uma sobe e a outra desce, o 1RM estimado desempata (sem ele, carga × reps). Por tempo, os
// segundos. Só séries de trabalho, na ordem: a 2ª de hoje contra a 2ª da última vez.
import type { ExerciseMode, SetKind, Workout, WorkoutSet } from './model';
import { e1rm } from './strength';
import { sessionsOf, workSets } from './workouts';

export type SetTrend = 'up' | 'same' | 'down';
type SetLike = { reps: number; weight: number };

const sign = (n: number): SetTrend => (n > 1e-9 ? 'up' : n < -1e-9 ? 'down' : 'same');
const strength = (s: SetLike) => e1rm(s.weight, s.reps) ?? s.weight * s.reps;

export function compareSet(prev: SetLike | undefined, cur: SetLike, mode: ExerciseMode): SetTrend | null {
  if (!prev || mode === 'cardio') return null;
  // por tempo: os segundos (no campo reps) decidem; a carga só desempata
  if (mode === 'time') return prev.reps !== cur.reps ? sign(cur.reps - prev.reps) : sign(cur.weight - prev.weight);
  const dw = cur.weight - prev.weight, dr = cur.reps - prev.reps;
  if (Math.abs(dw) < 1e-9) return sign(dr);
  if (dw > 0 && dr >= 0) return 'up';
  if (dw < 0 && dr <= 0) return 'down';
  // mais carga e menos reps (ou o contrário): quem desempata é a força estimada
  return sign(strength(cur) - strength(prev));
}

/**
 * As séries de trabalho da última sessão do exercício antes deste treino: data anterior ou, no
 * mesmo dia, começada antes (nunca um treino depois, nem o próprio).
 */
export function previousWorkSets(workouts: readonly Workout[], key: string, w: Pick<Workout, 'date' | 'id' | 'startedAt'>): WorkoutSet[] | null {
  const before = sessionsOf(workouts, key).filter(s => s.workout.id !== w.id && (s.workout.date < w.date ||
    (s.workout.date === w.date && !!s.workout.startedAt && !!w.startedAt && s.workout.startedAt < w.startedAt)));
  const last = before[before.length - 1];
  return last ? workSets(last.entry) : null;
}

/** A seta de cada série (null nas de aquecimento e nas sem par na última vez). */
export function setTrends(prev: readonly WorkoutSet[] | null, sets: readonly (SetLike & { kind: SetKind })[], mode: ExerciseMode): (SetTrend | null)[] {
  let n = 0;
  return sets.map(s => (s.kind === 'work' ? compareSet(prev?.[n++], s, mode) : null));
}

export const TREND_ARROW: Record<SetTrend, string> = { up: '↑', same: '=', down: '↓' };

const kg = (n: number) => `${String(Math.round(n * 100) / 100).replace('.', ',')} kg`;

/** Frase para o leitor de tela: "Mais que da última vez (40 kg × 10)". */
export function trendLabel(trend: SetTrend, prev: SetLike, mode: ExerciseMode): string {
  const word = trend === 'up' ? 'Mais que da última vez' : trend === 'down' ? 'Menos que da última vez' : 'Igual à última vez';
  const was = mode === 'time' ? `${prev.reps} s${prev.weight ? ` com ${kg(prev.weight)}` : ''}` : `${kg(prev.weight)} × ${prev.reps}`;
  return `${word} (${was})`;
}
