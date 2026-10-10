// Treino em andamento. Funções puras: recebem a sessão e devolvem outra, sem tocar no original.
// O que vira histórico ao finalizar são só as séries marcadas (regra do O1).
import type { DayKey } from './ai-plan';
import type { DateKey } from './dates';
import { toDateKey } from './dates';
import { normalizeExerciseName } from './text';
import { dayKeyOf, loadSourceOf, type AppData, type ExerciseMode, type PlanExercise, type SetKind, type Workout, type WorkoutEntry } from './model';
import { lastSessionBefore, workSets } from './workouts';
import { isCardioName } from '../data/exercise-library';
import { repRange, suggestProgression, type Progression } from './progression';
import { rotationTitle } from './rotation';

export interface SessionSet {
  reps: number;
  weight: number;
  kind: SetKind;
  done: boolean;
  /** Até a falha (S5). */
  failure?: true;
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
  /** M17: mesma marca nos vizinhos = superset. */
  superset?: string;
  /** Sugestão da progressão automática que preencheu as séries (M12), com o porquê. */
  progression?: Progression;
}

export interface ActiveSession {
  id: string;
  date: DateKey;
  startedAt: string;
  planId: string;
  dayKey: DayKey;
  dayName: string;
  exercises: SessionExercise[];
  /** M15: treino de um dia passado, registrado depois; a duração é a informada, não o relógio. */
  backdated?: { durationMin: number };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

type PlanTarget = Pick<PlanExercise, 'sets' | 'reps' | 'weight' | 'seconds' | 'repMin' | 'repMax' | 'increment'> & { linear?: boolean };

/**
 * Séries iniciais de um exercício, conforme a fonte escolhida (M13):
 * - 'auto': sugestão da progressão (M10–M12, docs/dev/progressao.md);
 * - 'last': repetições do plano e carga da última sessão (última série válida);
 * - 'plan': repetições e carga do plano, como estão escritas.
 * Sem histórico, a carga é a do plano em todos os casos.
 */
function initialSets(data: AppData, name: string, mode: ExerciseMode, plan: PlanTarget | null, date: DateKey): { sets: SessionSet[]; progression?: Progression } {
  if (mode === 'cardio') return { sets: [] };
  const key = normalizeExerciseName(name);
  const last = lastSessionBefore(data.workouts, key, date);
  const lastSets = last ? workSets(last.entry) : [];
  const count = plan?.sets || lastSets.length || 3;
  let reps = mode === 'time' ? (plan?.seconds ?? lastSets[0]?.reps ?? 30) : (plan?.reps || lastSets[0]?.reps || 10);
  let weight = lastSets.length ? lastSets[lastSets.length - 1]!.weight : (plan?.weight ?? 0);
  const source = loadSourceOf(data.settings);
  if (source === 'plan' && plan) {
    weight = plan.weight;
    if (mode === 'reps') reps = repRange(plan).max;
  }
  const progression = mode === 'reps' && plan && source === 'auto'
    ? suggestProgression(data.workouts, key, plan, date) ?? undefined
    : undefined;
  if (progression) ({ reps, weight } = progression);
  const sets = Array.from({ length: count }, () => ({ reps, weight, kind: 'work' as const, done: false }));
  return progression?.reason ? { sets, progression } : { sets };
}

function fromPlanExercise(data: AppData, ex: PlanExercise, date: DateKey, linear = false): SessionExercise {
  const out: SessionExercise = {
    slotId: ex.id,
    name: ex.name,
    key: normalizeExerciseName(ex.name),
    mode: ex.mode,
    optional: ex.optional,
    sets: [],
    note: '',
    alternatives: ex.alternatives
  };
  const start = initialSets(data, ex.name, ex.mode, { ...ex, linear }, date);
  out.sets = start.sets;
  if (start.progression) out.progression = start.progression;
  if (ex.mode === 'time' && ex.seconds) out.seconds = ex.seconds;
  if (ex.restSeconds) out.restSeconds = ex.restSeconds;
  if (ex.tip) out.tip = ex.tip;
  if (ex.superset) out.superset = ex.superset;
  if (ex.mode === 'cardio') out.cardio = { minutes: ex.minutes, km: ex.km, done: false };
  return out;
}

export function startSession(data: AppData, planId: string, dayKey: DayKey, now: Date, id: string): ActiveSession | null {
  const plan = data.plans[planId];
  const day = plan?.days[dayKey];
  if (!plan || !day || !day.exercises.length) return null;
  const date = toDateKey(now);
  return {
    // na rotação, sem o "Segunda:" que os modelos põem no nome (o treino não é da segunda)
    id, date, startedAt: now.toISOString(), planId, dayKey, dayName: plan.rotation ? rotationTitle(plan, dayKey) : day.name,
    exercises: day.exercises.map(ex => fromPlanExercise(data, ex, date, plan.progression === 'linear'))
  };
}

/**
 * M15: registrar um treino de um dia passado. Abre como um treino normal (com a carga sugerida
 * pelo histórico até aquela data); ao finalizar, entra com a data, o início e a duração informados.
 */
export function startPastSession(data: AppData, planId: string, dayKey: DayKey, date: DateKey, time: string, durationMin: number, id: string): ActiveSession | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  const started = new Date(`${date}T00:00:00`);
  started.setHours(Math.min(23, match ? Number(match[1]) : 18), Math.min(59, match ? Number(match[2]) : 0));
  const s = startSession(data, planId, dayKey, started, id);
  if (!s) return null;
  return { ...s, date, backdated: { durationMin: Math.min(300, Math.max(1, Math.round(durationMin))) } };
}

/** M18: põe um exercício no fim do treino em andamento, com a carga da última vez (ou 3×10). */
export function addExerciseToSession(s: ActiveSession, data: AppData, name: string): ActiveSession {
  const clean = name.trim();
  if (!clean || s.exercises.length >= 30) return s;
  const mode: ExerciseMode = isCardioName(clean) ? 'cardio' : 'reps';
  const ex: SessionExercise = {
    slotId: `extra-${s.exercises.length}-${normalizeExerciseName(clean)}`, name: clean, key: normalizeExerciseName(clean), mode,
    optional: false, sets: initialSets(data, clean, mode, null, s.date).sets, note: '', alternatives: []
  };
  if (mode === 'cardio') ex.cardio = { minutes: 20, km: 0, done: false };
  return { ...s, exercises: [...s.exercises, ex] };
}

/** M18: tira um exercício do treino em andamento (sempre fica pelo menos um). */
export function removeExerciseFromSession(s: ActiveSession, index: number): ActiveSession {
  if (s.exercises.length <= 1 || !s.exercises[index]) return s;
  return { ...s, exercises: s.exercises.filter((_, i) => i !== index) };
}

/**
 * Repetir hoje (R4): um treino do histórico vira o treino de hoje, com os mesmos exercícios e os
 * mesmos números, nada marcado. Dica, descanso e reservas vêm do plano quando o exercício está nele.
 */
export function repeatSession(data: AppData, workout: Workout, now: Date, id: string): ActiveSession | null {
  if (!workout.entries.length) return null;
  const planId = workout.planId && data.plans[workout.planId] ? workout.planId : (data.activePlanId ?? '');
  const dayKey = workout.dayKey ?? dayKeyOf(now);
  const planExercises = Object.values(data.plans[planId]?.days ?? {}).flatMap(d => d.exercises);
  const exercises = workout.entries.map((entry, i): SessionExercise => {
    const planEx = planExercises.find(p => normalizeExerciseName(p.name) === entry.key);
    const ex: SessionExercise = {
      slotId: planEx?.id ?? `repetir-${i}`,
      name: entry.name,
      key: entry.key,
      mode: entry.mode,
      optional: false,
      sets: entry.sets.map(set => ({ reps: set.reps, weight: set.weight, kind: set.kind, done: false })),
      note: '',
      alternatives: planEx?.alternatives ?? []
    };
    if (entry.mode === 'cardio') ex.cardio = { minutes: entry.cardio?.minutes ?? 20, km: entry.cardio?.km ?? 0, done: false };
    if (entry.mode === 'time' && entry.sets[0]) ex.seconds = entry.sets[0].reps;
    if (planEx?.restSeconds) ex.restSeconds = planEx.restSeconds;
    if (planEx?.tip) ex.tip = planEx.tip;
    return ex;
  });
  return {
    id, date: toDateKey(now), startedAt: now.toISOString(), planId, dayKey,
    dayName: workout.dayName || 'Treino repetido', exercises
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

/** S5: marca ou desmarca a série como levada até a falha (só séries de trabalho). */
export function toggleFailure(s: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return mapSet(s, exIndex, setIndex, set => {
    if (set.kind !== 'work') return set;
    if (set.failure) { const { failure: _f, ...rest } = set; return rest; }
    return { ...set, failure: true };
  });
}

/** Deslizar para a direita (R2): copia a série logo abaixo, ainda não feita. */
export function duplicateSet(s: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    const set = ex.sets[setIndex];
    if (!set || ex.mode === 'cardio' || ex.sets.length >= 20) return ex;
    const sets = [...ex.sets];
    const { failure: _f, ...copy } = set;
    sets.splice(setIndex + 1, 0, { ...copy, done: false });
    return { ...ex, sets };
  });
}

/** Desfazer a série apagada (R2): volta para o mesmo lugar, como estava. */
export function insertSet(s: ActiveSession, exIndex: number, setIndex: number, set: SessionSet): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    if (ex.mode === 'cardio' || ex.sets.length >= 20) return ex;
    const sets = [...ex.sets];
    sets.splice(Math.min(Math.max(0, setIndex), sets.length), 0, set);
    return { ...ex, sets };
  });
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
      const restored = fromPlanExercise(data, planEx, s.date, data.plans[s.planId]?.progression === 'linear');
      // a marca do superset é a do treino (pode ter sido juntado ou separado na hora)
      const { superset: _planMark, ...rest } = restored;
      return { ...rest, note: ex.note, ...(ex.superset ? { superset: ex.superset } : {}) };
    }
    const mode = option?.mode ?? ex.mode;
    const swapped: SessionExercise = {
      slotId: ex.slotId, name: name.trim(), key: normalizeExerciseName(name), mode, optional: ex.optional,
      sets: [], note: ex.note, alternatives: ex.alternatives, swappedFrom: original
    };
    const start = initialSets(data, name, mode, planEx && mode === planEx.mode ? { ...planEx, weight: 0, linear: data.plans[s.planId]?.progression === 'linear' } : null, s.date);
    swapped.sets = start.sets;
    if (start.progression) swapped.progression = start.progression;
    if (ex.restSeconds) swapped.restSeconds = ex.restSeconds;
    if (ex.tip) swapped.tip = ex.tip;
    if (ex.superset) swapped.superset = ex.superset;
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
    const sets = ex.sets.filter(set => set.done).map(({ reps, weight, kind, failure }) => ({ reps, weight, kind, ...(failure ? { failure } : {}) }));
    if (sets.length) entries.push({ key: ex.key, name: ex.name, mode: ex.mode, sets, ...(note ? { note } : {}) });
  }
  if (!entries.length) return null;
  // M15: treino passado usa a duração informada; senão, o relógio do início até agora
  const durationMin = s.backdated ? s.backdated.durationMin : Math.max(0, Math.round((now.getTime() - Date.parse(s.startedAt)) / 60000));
  const endedAt = s.backdated ? new Date(Date.parse(s.startedAt) + durationMin * 60000).toISOString() : now.toISOString();
  return {
    id: s.id, date: s.date, startedAt: s.startedAt, endedAt,
    // sessões esquecidas abertas (mais de 5 h) não registram uma duração absurda
    ...(durationMin > 0 && durationMin <= 300 ? { durationMin } : {}),
    planId: s.planId, dayKey: s.dayKey, dayName: s.dayName, source: 'app', entries
  };
}

/** M17: o bloco de exercícios seguidos com a mesma marca de superset em volta de `index`. */
export function supersetBlock(exercises: readonly { superset?: string | undefined }[], index: number): { start: number; end: number } | null {
  const mark = exercises[index]?.superset;
  if (!mark) return null;
  let start = index, end = index;
  while (start > 0 && exercises[start - 1]?.superset === mark) start--;
  while (end < exercises.length - 1 && exercises[end + 1]?.superset === mark) end++;
  return end > start ? { start, end } : null;
}

/**
 * M17: depois de marcar uma série, descansa? Num superset, só no fim da rodada (último exercício do
 * bloco); antes disso, `next` é o exercício seguinte do bloco.
 */
export function afterSet(s: ActiveSession, index: number): { rest: boolean; next: number | null } {
  const block = supersetBlock(s.exercises, index);
  if (!block || index === block.end) return { rest: true, next: block ? block.start : null };
  return { rest: false, next: index + 1 };
}

/** M17: junta o exercício ao próximo (os dois passam a ter a mesma marca) ou separa do bloco. */
export function toggleSupersetWithNext<T extends { superset?: string }>(list: readonly T[], index: number, makeId: () => string): T[] {
  const cur = list[index], next = list[index + 1];
  if (!cur || !next) return [...list];
  const out = [...list];
  if (cur.superset && cur.superset === next.superset) {
    // separa: o próximo e os seguintes do bloco ficam com uma marca nova (ou nenhuma, se sobrar um só)
    const mark = cur.superset, fresh = makeId();
    for (let i = index + 1; i < out.length && list[i]!.superset === mark; i++) out[i] = { ...out[i]!, superset: fresh };
    const clean = (i: number) => {
      const b = supersetBlock(out, i);
      if (!b && out[i]?.superset) { const { superset: _m, ...rest } = out[i]!; out[i] = rest as T; }
    };
    clean(index); clean(index + 1);
    return out;
  }
  const mark = cur.superset ?? next.superset ?? makeId();
  const oldNext = next.superset;
  out[index] = { ...cur, superset: mark };
  for (let i = index + 1; i < out.length && (i === index + 1 || (oldNext && list[i]!.superset === oldNext)); i++) out[i] = { ...out[i]!, superset: mark };
  return out;
}
