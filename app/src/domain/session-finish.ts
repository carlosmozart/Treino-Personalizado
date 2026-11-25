// Sessão de treino: progresso, descanso, supersets e virar histórico (ver session.ts).
import { type Settings, type SetTechnique, type Workout, type WorkoutEntry } from './model';
import { type SessionExercise, type ActiveSession } from './session-types';
import { activeMs } from './session-flow';
import { EXTRA_PREFIX } from './session-start';

/**
 * T3: o próximo exercício ainda pendente depois de `from` (dando a volta para os de antes).
 * Null quando todos estão feitos.
 */
export function nextOpenExercise(exercises: readonly SessionExercise[], from: number): number | null {
  for (let step = 1; step < exercises.length; step++) {
    const i = (from + step) % exercises.length;
    if (!isExerciseDone(exercises[i]!)) return i;
  }
  return null;
}

/**
 * Descanso depois de marcar uma série: o desta série (T17), senão o do exercício (ou o padrão);
 * depois de aquecimento, o do ajuste T6 quando definido (0 = sem descanso).
 */
/** M49: descanso antes de um drop-set (nenhum) e de um rest-pause (uns segundos). */
export const TECHNIQUE_REST: Record<SetTechnique, number> = { drop: 0, restpause: 15 };

export function restAfterSet(ex: SessionExercise, setIndex: number, settings: Pick<Settings, 'restSeconds' | 'warmupRest'>): number {
  // T17: o descanso escolhido só para esta série vale acima de tudo
  const own = ex.sets[setIndex]?.rest;
  if (own !== undefined) return own;
  // M49: a próxima é drop-set (sem descanso) ou rest-pause (uns segundos)
  const next = ex.sets[setIndex + 1]?.technique;
  if (next) return TECHNIQUE_REST[next];
  const normal = ex.restSeconds ?? settings.restSeconds;
  return ex.sets[setIndex]?.kind === 'warmup' && settings.warmupRest !== undefined ? settings.warmupRest : normal;
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
  // T13: "Adicionar exercício" num treino do plano (no treino livre tudo é acrescentado)
  const added = (ex: SessionExercise) => !!s.planId && ex.slotId.startsWith(EXTRA_PREFIX);
  const entries: WorkoutEntry[] = [];
  for (const ex of s.exercises) {
    const note = ex.note.trim();
    if (ex.mode === 'cardio') {
      if (!ex.cardio?.done) continue;
      entries.push({ key: ex.key, name: ex.name, mode: 'cardio', sets: [], cardio: { minutes: ex.cardio.minutes, ...(ex.cardio.km ? { km: ex.cardio.km } : {}), ...(ex.cardio.level ? { level: ex.cardio.level } : {}) }, ...(note ? { note } : {}) });
      continue;
    }
    const sets = ex.sets.filter(set => set.done).map(({ reps, weight, kind, failure, technique, rpe, note, at }) => ({ reps, weight, kind, ...(failure ? { failure } : {}), ...(technique ? { technique } : {}), ...(rpe ? { rpe } : {}), ...(note ? { note } : {}), ...(at ? { at } : {}) }));
    if (sets.length) entries.push({ key: ex.key, name: ex.name, mode: ex.mode, sets, ...(note ? { note } : {}), ...(ex.perSide ? { perSide: true as const } : {}), ...(added(ex) ? { added: true as const } : {}) });
  }
  if (!entries.length) return null;
  // M15: treino passado usa a duração informada; senão, o relógio do início até agora, sem as pausas (W3)
  const durationMin = s.backdated ? s.backdated.durationMin : Math.round(activeMs(s, now) / 60000);
  const endedAt = s.backdated ? new Date(Date.parse(s.startedAt) + durationMin * 60000).toISOString() : now.toISOString();
  // W13: exercícios do plano sem nenhuma série feita (os opcionais não contam)
  const skipped = s.planId ? s.exercises.filter(ex => !ex.optional && !ex.sets.some(x => x.done) && !ex.cardio?.done).map(ex => ex.name) : [];
  return {
    id: s.id, date: s.date, startedAt: s.startedAt, endedAt,
    // sessões esquecidas abertas (mais de 5 h) não registram uma duração absurda
    ...(durationMin > 0 && durationMin <= 300 ? { durationMin } : {}),
    planId: s.planId, dayKey: s.dayKey, dayName: s.dayName, source: 'app', entries,
    ...(s.light ? { light: s.light } : {}),
    ...(s.form && Object.keys(s.form).length ? { form: s.form } : {}),
    ...(skipped.length ? { skipped } : {}),
    ...(s.autoFinished ? { autoFinished: true as const } : {})
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
