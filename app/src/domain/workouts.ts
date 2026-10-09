// Leituras derivadas dos treinos. Nada daqui é gravado: corrigir um treino corrige tudo.
import { cardioMet, kcal, strengthMet, type LoggedSet } from './calories';
import type { Workout, WorkoutEntry, WorkoutSet } from './model';

/** Segundos médios de execução de uma série, para estimar a duração quando o cronômetro falha. */
export const SECONDS_PER_SET = 45;

/** Séries que contam para volume, recordes e progressão (aquecimento fica de fora). */
export function workSets(entry: WorkoutEntry): WorkoutSet[] {
  return entry.sets.filter(s => s.kind === 'work');
}

export function entryVolume(entry: WorkoutEntry): number {
  return workSets(entry).reduce((total, s) => total + s.reps * s.weight, 0);
}

export function workoutVolume(workout: Workout): number {
  return workout.entries.reduce((total, e) => total + entryVolume(e), 0);
}

/** Maior carga; empate decidido por repetições. */
export function bestSet(entry: WorkoutEntry): WorkoutSet | null {
  const sets = workSets(entry);
  if (!sets.length) return null;
  return sets.reduce((best, s) => (s.weight > best.weight || (s.weight === best.weight && s.reps > best.reps) ? s : best));
}

/**
 * Resumo curto: "3x10 · 40kg", "12/10/8 · 50-40kg", "25min · 3km".
 * Registros reconstruídos do formato antigo são identificados para não fingir precisão.
 */
export function describeEntry(entry: WorkoutEntry): string {
  if (entry.mode === 'cardio') {
    const c = entry.cardio;
    return c ? `${c.minutes}min${c.km ? ` · ${c.km}km` : ''}` : '--';
  }
  const sets = workSets(entry);
  if (!sets.length) return '--';
  const reps = sets.map(s => s.reps);
  const weights = sets.map(s => s.weight);
  const sameReps = reps.every(r => r === reps[0]);
  const sameWeight = weights.every(w => w === weights[0]);
  const repsPart = sameReps ? `${sets.length}x${reps[0]}` : reps.join('/');
  const kg = (n: number) => String(n).replace('.', ',');
  const weightPart = sameWeight ? `${kg(weights[0]!)}kg` : `${kg(Math.max(...weights))}-${kg(Math.min(...weights))}kg`;
  const failure = sets.some(x => x.failure) ? ' · até a falha' : '';
  return `${repsPart} · ${weightPart}${failure}${entry.aggregated ? ' (registro antigo)' : ''}`;
}

/** Sessões de um exercício (pela identidade do nome), em ordem de data. */
export function sessionsOf(workouts: readonly Workout[], key: string): { workout: Workout; entry: WorkoutEntry }[] {
  const out: { workout: Workout; entry: WorkoutEntry }[] = [];
  for (const workout of workouts) {
    for (const entry of workout.entries) if (entry.key === key) out.push({ workout, entry });
  }
  return out.sort((a, b) => (a.workout.date < b.workout.date ? -1 : a.workout.date > b.workout.date ? 1 : 0));
}

/** Última sessão do exercício antes de uma data (exclusiva), para pré-preencher o treino. */
export function lastSessionBefore(workouts: readonly Workout[], key: string, date: string) {
  const before = sessionsOf(workouts, key).filter(s => s.workout.date < date);
  return before[before.length - 1] ?? null;
}

/**
 * Recorde: a melhor série supera a melhor de todas as sessões ANTERIORES (por data).
 * A primeira sessão não conta. Treinos registrados depois, com data antiga, não ganham
 * recorde sobre treinos que vieram depois deles.
 */
export function isPersonalRecord(workouts: readonly Workout[], workout: Workout, entry: WorkoutEntry): boolean {
  const current = bestSet(entry);
  if (!current) return false;
  let previousBest: WorkoutSet | null = null;
  for (const s of sessionsOf(workouts, entry.key)) {
    if (s.workout.date >= workout.date || s.workout.id === workout.id) continue;
    const b = bestSet(s.entry);
    if (b && (!previousBest || b.weight > previousBest.weight || (b.weight === previousBest.weight && b.reps > previousBest.reps))) previousBest = b;
  }
  if (!previousBest) return false;
  return current.weight > previousBest.weight || (current.weight === previousBest.weight && current.reps > previousBest.reps);
}

/** Duração mínima plausível: séries × (execução + descanso). */
export function estimatedStrengthMinutes(workout: Workout, restSeconds: number): number {
  const sets = workout.entries.filter(e => e.mode !== 'cardio').reduce((n, e) => n + e.sets.length, 0);
  return (sets * (SECONDS_PER_SET + (restSeconds || 90))) / 60;
}

export interface WorkoutCalories {
  kcal: number;
  /** false quando a duração usada foi a estimada (cronômetro ausente ou muito abaixo do plausível). */
  measured: boolean;
  /** Minutos de força efetivamente usados no cálculo, para a interface mostrar "~30 min (estimado)" (O4). */
  strengthMinutes: number;
}

export function workoutCalories(workout: Workout, bodyWeightKg: number, restSeconds: number): WorkoutCalories | null {
  if (!bodyWeightKg || !workout.entries.length) return null;
  let total = 0;
  let cardioMinutes = 0;
  for (const e of workout.entries) {
    if (e.mode !== 'cardio' || !e.cardio) continue;
    cardioMinutes += e.cardio.minutes;
    total += kcal(cardioMet(e.cardio.minutes, e.cardio.km ?? 0), bodyWeightKg, e.cardio.minutes);
  }
  const estimated = estimatedStrengthMinutes(workout, restSeconds);
  let minutes = workout.durationMin ? Math.max(0, workout.durationMin - cardioMinutes) : estimated;
  let measured = !!workout.durationMin;
  // Cronômetro que só começou no fim registra 2 min para uma hora de treino: abaixo de metade
  // do mínimo físico, vale a estimativa.
  if (measured && estimated > 0 && minutes < estimated * 0.5) { minutes = estimated; measured = false; }
  const sets: LoggedSet[] = workout.entries.filter(e => e.mode !== 'cardio').flatMap(workSets);
  if (sets.length) total += kcal(strengthMet(sets, bodyWeightKg, minutes), bodyWeightKg, minutes);
  if (total <= 0) return null;
  return { kcal: Math.round(total), measured, strengthMinutes: Math.round(minutes) };
}

export interface ExerciseSummary { key: string; name: string; sessions: number; lastDate: string }

/** Exercícios já registrados, do mais recente para o mais antigo. */
export function exercisesInHistory(workouts: readonly Workout[]): ExerciseSummary[] {
  const map = new Map<string, ExerciseSummary>();
  for (const w of workouts) {
    for (const e of w.entries) {
      const cur = map.get(e.key);
      if (!cur) map.set(e.key, { key: e.key, name: e.name, sessions: 1, lastDate: w.date });
      else {
        cur.sessions++;
        if (w.date >= cur.lastDate) { cur.lastDate = w.date; cur.name = e.name; }
      }
    }
  }
  return [...map.values()].sort((a, b) => (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : a.name.localeCompare(b.name)));
}

export interface ProgressPoint { date: string; workoutId: string; value: number; label: string; volume: number }

/**
 * Evolução de um exercício: melhor carga por sessão (força) ou minutos (cardio). Valor 0 fica
 * de fora do gráfico (sessão sem carga, ex.: peso do corpo).
 */
export function exerciseProgress(workouts: readonly Workout[], key: string): ProgressPoint[] {
  return sessionsOf(workouts, key).map(({ workout, entry }) => {
    const best = bestSet(entry);
    const value = entry.mode === 'cardio' ? entry.cardio?.minutes ?? 0 : best?.weight ?? 0;
    return { date: workout.date, workoutId: workout.id, value, label: describeEntry(entry), volume: Math.round(entryVolume(entry)) };
  });
}

/**
 * Carga provavelmente digitada errada (um dígito a mais): bem acima do melhor registro, ou
 * absurda sem histórico. Devolve o melhor registro e, quando faz sentido, a carga ÷ 10.
 * Progressão ousada (40 → 85 kg) passa; 600 no lugar de 60 não.
 */
export function suspiciousWeight(workouts: readonly Workout[], key: string, weight: number): { max: number; suggestion: number | null } | null {
  if (!(weight > 0)) return null;
  let max = 0;
  for (const { entry } of sessionsOf(workouts, key)) for (const s of workSets(entry)) if (s.weight > max) max = s.weight;
  const divided = weight >= 100 ? Math.round(weight * 10) / 100 : null;
  if (max > 0) {
    if (weight <= max * 2.5) return null;
    const plausible = divided !== null && divided <= max * 2.5 && divided > max * 0.3;
    return { max, suggestion: plausible ? divided : null };
  }
  return weight > 500 ? { max: 0, suggestion: divided } : null;
}

export type Trend = 'up' | 'same' | 'down' | 'first';

/**
 * S4: melhor série deste treino contra a da última vez (antes da data): carga primeiro, depois
 * repetições. Cardio e registros sem séries ficam de fora.
 */
export function compareWithLast(workouts: readonly Workout[], workout: Workout, entry: WorkoutEntry): { trend: Trend; before: WorkoutSet | null } | null {
  const now = bestSet(entry);
  if (!now) return null;
  const last = lastSessionBefore(workouts, entry.key, workout.date);
  const before = last ? bestSet(last.entry) : null;
  if (!before) return { trend: 'first', before: null };
  const diff = now.weight !== before.weight ? now.weight - before.weight : now.reps - before.reps;
  return { trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same', before };
}
