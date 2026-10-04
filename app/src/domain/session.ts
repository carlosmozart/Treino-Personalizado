// Treino em andamento. Funções puras: recebem a sessão e devolvem outra, sem tocar no original.
// O que vira histórico ao finalizar são só as séries marcadas (regra do O1).
import type { DayKey } from './ai-plan';
import type { DateKey } from './dates';
import { toDateKey } from './dates';
import { normalizeExerciseName } from './text';
import type { AppData, ExerciseMode, PlanExercise, SetKind, Workout, WorkoutEntry } from './model';
import { lastSessionBefore, workSets } from './workouts';
import { isCardioName } from '../data/exercise-library';

export interface SessionSet {
  reps: number;
  weight: number;
  kind: SetKind;
  done: boolean;
}

export interface SessionExercise {
  /** id do exercício no plano (estável durante o treino, mesmo após trocar pela reserva). */
  slotId: string;
  name: string;
  key: string;
  mode: ExerciseMode;
  optional: boolean;
  sets: SessionSet[];
  /** Meta em segundos por série (modo time). */
  seconds?: number;
  cardio?: { minutes: number; km: number; done: boolean };
  note: string;
  restSeconds?: number;
  tip?: string;
  alternatives: { name: string; mode: ExerciseMode }[];
  /** Nome original do plano quando trocado por uma reserva. */
  swappedFrom?: string;
}

export interface ActiveSession {
  id: string;
  date: DateKey;
  startedAt: string;
  planId: string;
  dayKey: DayKey;
  dayName: string;
  exercises: SessionExercise[];
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Séries iniciais de um exercício: repetições do plano, carga da última sessão (última série
 * válida) ou, sem histórico, a carga do plano.
 */
function initialSets(data: AppData, name: string, mode: ExerciseMode, plan: Pick<PlanExercise, 'sets' | 'reps' | 'weight' | 'seconds'> | null, date: DateKey): SessionSet[] {
  if (mode === 'cardio') return [];
  const last = lastSessionBefore(data.workouts, normalizeExerciseName(name), date);
  const lastSets = last ? workSets(last.entry) : [];
  const count = plan?.sets || lastSets.length || 3;
  const reps = mode === 'time' ? (plan?.seconds ?? lastSets[0]?.reps ?? 30) : (plan?.reps || lastSets[0]?.reps || 10);
  const weight = lastSets.length ? lastSets[lastSets.length - 1]!.weight : (plan?.weight ?? 0);
  return Array.from({ length: count }, () => ({ reps, weight, kind: 'work' as const, done: false }));
}

function fromPlanExercise(data: AppData, ex: PlanExercise, date: DateKey): SessionExercise {
  const out: SessionExercise = {
    slotId: ex.id,
    name: ex.name,
    key: normalizeExerciseName(ex.name),
    mode: ex.mode,
    optional: ex.optional,
    sets: initialSets(data, ex.name, ex.mode, ex, date),
    note: '',
    alternatives: ex.alternatives
  };
  if (ex.mode === 'time' && ex.seconds) out.seconds = ex.seconds;
  if (ex.restSeconds) out.restSeconds = ex.restSeconds;
  if (ex.tip) out.tip = ex.tip;
  if (ex.mode === 'cardio') out.cardio = { minutes: ex.minutes, km: ex.km, done: false };
  return out;
}

export function startSession(data: AppData, planId: string, dayKey: DayKey, now: Date, id: string): ActiveSession | null {
  const day = data.plans[planId]?.days[dayKey];
  if (!day || !day.exercises.length) return null;
  const date = toDateKey(now);
  return {
    id, date, startedAt: now.toISOString(), planId, dayKey, dayName: day.name,
    exercises: day.exercises.map(ex => fromPlanExercise(data, ex, date))
  };
}

function mapExercise(s: ActiveSession, index: number, fn: (ex: SessionExercise) => SessionExercise): ActiveSession {
  const target = s.exercises[index];
  if (!target) return s;
  const changed = fn(target);
  // nada mudou: devolve a mesma sessão, e a store não grava à toa
  return changed === target ? s : { ...s, exercises: s.exercises.map((ex, i) => (i === index ? changed : ex)) };
}

function mapSet(s: ActiveSession, exIndex: number, setIndex: number, fn: (set: SessionSet) => SessionSet): ActiveSession {
  return mapExercise(s, exIndex, ex => (ex.sets[setIndex]
    ? { ...ex, sets: ex.sets.map((set, i) => (i === setIndex ? fn(set) : set)) }
    : ex));
}

export function toggleSet(s: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return mapSet(s, exIndex, setIndex, set => ({ ...set, done: !set.done }));
}

export function updateSet(s: ActiveSession, exIndex: number, setIndex: number, patch: Partial<Pick<SessionSet, 'reps' | 'weight' | 'kind'>>): ActiveSession {
  return mapSet(s, exIndex, setIndex, set => ({
    ...set,
    ...(patch.kind ? { kind: patch.kind } : {}),
    ...(patch.reps !== undefined ? { reps: clamp(Math.round(patch.reps), 0, 999) } : {}),
    ...(patch.weight !== undefined ? { weight: clamp(round1(patch.weight), 0, 999) } : {})
  }));
}

/** Nova série copia a última (é o que a pessoa costuma repetir). */
export function addSet(s: ActiveSession, exIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    if (ex.mode === 'cardio' || ex.sets.length >= 20) return ex;
    const last = ex.sets[ex.sets.length - 1];
    return { ...ex, sets: [...ex.sets, { reps: last?.reps ?? 10, weight: last?.weight ?? 0, kind: 'work', done: false }] };
  });
}

/**
 * Série de aquecimento (M8) antes das séries de trabalho: metade da carga da primeira série,
 * 10 reps. Fica fora de volume, recordes, 1RM e progressão (só séries de trabalho contam).
 */
export function addWarmupSet(s: ActiveSession, exIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    if (ex.mode === 'cardio' || ex.sets.length >= 20) return ex;
    const firstWork = ex.sets.find(x => x.kind === 'work');
    const at = ex.sets.filter(x => x.kind === 'warmup').length;
    const weight = Math.round(((firstWork?.weight ?? 0) / 2) * 2) / 2;
    const sets = [...ex.sets];
    sets.splice(at, 0, { reps: 10, weight, kind: 'warmup', done: false });
    return { ...ex, sets };
  });
}

/** Remove a última série de aquecimento. */
export function removeWarmupSet(s: ActiveSession, exIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    const i = ex.sets.map(x => x.kind).lastIndexOf('warmup');
    return i < 0 ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== i) };
  });
}

export function removeSet(s: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => (ex.sets.length > 1 ? { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) } : ex));
}

/** Concluir pelo botão do exercício marca todas as séries (ou o cardio). */
export function completeExercise(s: ActiveSession, exIndex: number, done = true): ActiveSession {
  return mapExercise(s, exIndex, ex => ({
    ...ex,
    sets: ex.sets.map(set => ({ ...set, done })),
    ...(ex.cardio ? { cardio: { ...ex.cardio, done } } : {})
  }));
}

export function updateCardio(s: ActiveSession, exIndex: number, patch: Partial<{ minutes: number; km: number; done: boolean }>): ActiveSession {
  return mapExercise(s, exIndex, ex => (ex.cardio ? {
    ...ex,
    cardio: {
      minutes: patch.minutes !== undefined ? clamp(Math.round(patch.minutes), 0, 600) : ex.cardio.minutes,
      km: patch.km !== undefined ? clamp(round1(patch.km), 0, 300) : ex.cardio.km,
      done: patch.done ?? ex.cardio.done
    }
  } : ex));
}

export function setNote(s: ActiveSession, exIndex: number, note: string): ActiveSession {
  return mapExercise(s, exIndex, ex => ({ ...ex, note: note.slice(0, 500) }));
}

/**
 * Troca pelo exercício reserva (ou volta ao original). As séries são refeitas com o histórico
 * do novo exercício, já que a carga de um não serve para o outro.
 */
/** Soma `delta` kg à carga das séries ainda não feitas (botões de ajuste, O20). */
export function adjustWeights(s: ActiveSession, exIndex: number, delta: number): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    if (!ex.sets.some(set => !set.done)) return ex;
    return { ...ex, sets: ex.sets.map(set => (set.done ? set : { ...set, weight: Math.round(Math.max(0, set.weight + delta) * 10) / 10 })) };
  });
}

/**
 * Troca o exercício neste treino: pela reserva do plano, de volta ao original ou por qualquer
 * nome (biblioteca ou digitado). O plano não muda.
 */
export function swapExercise(s: ActiveSession, data: AppData, exIndex: number, name: string): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    const original = ex.swappedFrom ?? ex.name;
    const planEx = data.plans[s.planId]?.days[s.dayKey].exercises.find(p => p.id === ex.slotId);
    const backToOriginal = normalizeExerciseName(name) === normalizeExerciseName(original);
    if (!name.trim() || normalizeExerciseName(name) === normalizeExerciseName(ex.name)) return ex;
    const option = backToOriginal ? null
      : ex.alternatives.find(a => normalizeExerciseName(a.name) === normalizeExerciseName(name))
        ?? { name: name.trim(), mode: isCardioName(name) ? 'cardio' as const : ex.mode === 'cardio' ? 'reps' as const : ex.mode };
    if (backToOriginal && planEx) {
      const restored = fromPlanExercise(data, planEx, s.date);
      return { ...restored, note: ex.note };
    }
    const mode = option?.mode ?? ex.mode;
    const swapped: SessionExercise = {
      slotId: ex.slotId, name: name.trim(), key: normalizeExerciseName(name), mode, optional: ex.optional,
      sets: initialSets(data, name, mode, planEx && mode === planEx.mode ? { ...planEx, weight: 0 } : null, s.date),
      note: ex.note, alternatives: ex.alternatives, swappedFrom: original
    };
    if (ex.restSeconds) swapped.restSeconds = ex.restSeconds;
    if (ex.tip) swapped.tip = ex.tip;
    if (mode === 'cardio') swapped.cardio = { minutes: planEx?.minutes || 20, km: 0, done: false };
    return swapped;
  });
}

export function isExerciseDone(ex: SessionExercise): boolean {
  return ex.mode === 'cardio' ? !!ex.cardio?.done : ex.sets.length > 0 && ex.sets.every(set => set.done);
}

export interface SessionProgress {
  exercisesDone: number;
  exercisesTotal: number;
  setsDone: number;
  setsTotal: number;
  /** Todos os exercícios obrigatórios concluídos: vale check-in cheio. */
  complete: boolean;
}

/** Contagens para o aviso de treino incompleto (O5: séries, não só exercícios inteiros). */
export function sessionProgress(s: ActiveSession): SessionProgress {
  const required = s.exercises.filter(ex => !ex.optional);
  return {
    exercisesDone: s.exercises.filter(isExerciseDone).length,
    exercisesTotal: s.exercises.length,
    setsDone: s.exercises.reduce((n, ex) => n + ex.sets.filter(set => set.done).length, 0),
    setsTotal: s.exercises.reduce((n, ex) => n + ex.sets.length, 0),
    complete: required.length > 0 && required.every(isExerciseDone)
  };
}

/** O treino como vai para o histórico: só o que foi feito. Null se nada foi marcado. */
export function sessionToWorkout(s: ActiveSession, now: Date): Workout | null {
  const entries: WorkoutEntry[] = [];
  for (const ex of s.exercises) {
    const note = ex.note.trim();
    if (ex.mode === 'cardio') {
      if (!ex.cardio?.done) continue;
      entries.push({ key: ex.key, name: ex.name, mode: 'cardio', sets: [], cardio: { minutes: ex.cardio.minutes, ...(ex.cardio.km ? { km: ex.cardio.km } : {}) }, ...(note ? { note } : {}) });
      continue;
    }
    const sets = ex.sets.filter(set => set.done).map(({ reps, weight, kind }) => ({ reps, weight, kind }));
    if (sets.length) entries.push({ key: ex.key, name: ex.name, mode: ex.mode, sets, ...(note ? { note } : {}) });
  }
  if (!entries.length) return null;
  const durationMin = Math.max(0, Math.round((now.getTime() - Date.parse(s.startedAt)) / 60000));
  return {
    id: s.id, date: s.date, startedAt: s.startedAt, endedAt: now.toISOString(),
    // sessões esquecidas abertas (mais de 5 h) não registram uma duração absurda
    ...(durationMin > 0 && durationMin <= 300 ? { durationMin } : {}),
    planId: s.planId, dayKey: s.dayKey, dayName: s.dayName, source: 'app', entries
  };
}
