// Sessão de treino: mexer nas séries e nos exercícios durante o treino (ver session.ts).
import { normalizeExerciseName } from './text';
import { type AppData } from './model';
import { isCardioName } from '../data/exercise-library';
import { snapStack } from './stack';
import { type SessionSet, type SessionExercise, type ActiveSession } from './session-types';
import { round1, roundKg, clamp, initialSets, fromPlanExercise, warmupInto, withAutoWarmup, refreshAutoWarmup } from './session-start';

/** Trava ou destrava a carga do exercício neste treino (a sugestão da progressão some ao travar). */
export function setExerciseLock(s: ActiveSession, index: number, on: boolean): ActiveSession {
  return mapExercise(s, index, ex => {
    if (!!ex.lockWeight === on) return ex;
    const { lockWeight: _l, progression: _p, ...rest } = ex;
    return on ? { ...rest, lockWeight: true } : (ex.progression ? { ...rest, progression: ex.progression } : rest);
  });
}

/** Descanso só deste exercício no treino: `undefined` volta ao padrão, 0 = sem cronômetro. */
export function setExerciseRest(s: ActiveSession, index: number, seconds: number | undefined): ActiveSession {
  return mapExercise(s, index, ex => {
    if (ex.restSeconds === seconds) return ex;
    const { restSeconds: _old, ...rest } = ex;
    return seconds === undefined ? rest : { ...rest, restSeconds: Math.min(600, Math.max(0, Math.round(seconds))) };
  });
}

export function mapExercise(s: ActiveSession, index: number, fn: (ex: SessionExercise) => SessionExercise): ActiveSession {
  const target = s.exercises[index];
  if (!target) return s;
  const changed = fn(target);
  // nada mudou: devolve a mesma sessão, e a store não grava à toa
  return changed === target ? s : { ...s, exercises: s.exercises.map((ex, i) => (i === index ? changed : ex)) };
}

export function mapSet(s: ActiveSession, exIndex: number, setIndex: number, fn: (set: SessionSet) => SessionSet): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    const target = ex.sets[setIndex];
    if (!target) return ex;
    const changed = fn(target);
    // nada mudou: a mesma série, e a sessão também (a store não grava à toa)
    return changed === target ? ex : { ...ex, sets: ex.sets.map((set, i) => (i === setIndex ? changed : set)) };
  });
}

/** Marca ou desmarca a série; com `now`, grava a hora em que foi marcada (V14). */
export function toggleSet(s: ActiveSession, exIndex: number, setIndex: number, now?: Date): ActiveSession {
  return mapSet(s, exIndex, setIndex, set => {
    if (set.done) { const { at: _a, ...rest } = set; return { ...rest, done: false }; }
    return { ...set, done: true, ...(now ? { at: now.toISOString() } : {}) };
  });
}

export function updateSet(s: ActiveSession, exIndex: number, setIndex: number, patch: Partial<Pick<SessionSet, 'reps' | 'weight' | 'kind'>>): ActiveSession {
  const next = mapSet(s, exIndex, setIndex, set => {
    const changed: SessionSet = {
      ...set,
      ...(patch.kind ? { kind: patch.kind } : {}),
      ...(patch.reps !== undefined ? { reps: clamp(Math.round(patch.reps), 0, 999) } : {}),
      ...(patch.weight !== undefined ? { weight: clamp(roundKg(patch.weight), 0, 999) } : {})
    };
    if (changed.reps === set.reps && changed.weight === set.weight && changed.kind === set.kind) return set;
    // V8: aquecimento mexido à mão deixa de acompanhar a carga
    if (changed.auto) { const { auto: _a, ...rest } = changed; return rest; }
    return changed;
  });
  // V8: mudou a carga de trabalho: a rampa ainda não feita acompanha
  return next === s || next.exercises[exIndex]?.sets[setIndex]?.kind !== 'work' ? next : mapExercise(next, exIndex, refreshAutoWarmup);
}

/** T17: descanso depois de uma série, só neste treino: `undefined` volta ao do exercício, 0 = sem cronômetro. */
export function setSetRest(s: ActiveSession, exIndex: number, setIndex: number, seconds: number | undefined): ActiveSession {
  return mapSet(s, exIndex, setIndex, set => {
    if (set.rest === seconds) return set;
    const { rest: _old, ...rest } = set;
    return seconds === undefined ? rest : { ...rest, rest: Math.min(600, Math.max(0, Math.round(seconds))) };
  });
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
  return mapExercise(s, exIndex, warmupInto);
}

/** Remove a última série de aquecimento. */
export function removeWarmupSet(s: ActiveSession, exIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    const i = ex.sets.map(x => x.kind).lastIndexOf('warmup');
    return i < 0 ? ex : withoutSet(ex, i);
  });
}

/** Tira uma série; tirar um aquecimento da rampa desliga a rampa deste exercício (V8). */
export function withoutSet(ex: SessionExercise, setIndex: number): SessionExercise {
  const removed = ex.sets[setIndex];
  const out = { ...ex, sets: ex.sets.filter((_, i) => i !== setIndex) };
  if (removed?.auto && out.autoWarmup) {
    const { autoWarmup: _w, ...rest } = out;
    return rest;
  }
  return out;
}

export function removeSet(s: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => (ex.sets.length > 1 ? withoutSet(ex, setIndex) : ex));
}

/** S5: marca ou desmarca a série como levada até a falha (só séries de trabalho). */
export function toggleFailure(s: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return mapSet(s, exIndex, setIndex, set => {
    if (set.kind !== 'work') return set;
    if (set.failure) { const { failure: _f, ...rest } = set; return rest; }
    return { ...set, failure: true };
  });
}

/** Nota de uma série deixando no máximo 200 caracteres. */
export const SET_NOTE_MAX = 200;

/** V2: a nota de uma série; vazia apaga. */
export function setSetNote(s: ActiveSession, exIndex: number, setIndex: number, note: string): ActiveSession {
  const clean = note.trim().replace(/\s+/g, ' ').slice(0, SET_NOTE_MAX);
  return mapSet(s, exIndex, setIndex, set => {
    if ((set.note ?? '') === clean) return set;
    const { note: _old, ...rest } = set;
    return clean ? { ...rest, note: clean } : rest;
  });
}

/** Deslizar para a direita (R2): copia a série logo abaixo, ainda não feita. */
export function duplicateSet(s: ActiveSession, exIndex: number, setIndex: number): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    const set = ex.sets[setIndex];
    if (!set || ex.mode === 'cardio' || ex.sets.length >= 20) return ex;
    const sets = [...ex.sets];
    // a cópia nasce sem falha, sem a nota e sem o descanso próprio da original
    const { failure: _f, note: _n, rest: _r, ...copy } = set;
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
export function completeExercise(s: ActiveSession, exIndex: number, done = true, now?: Date): ActiveSession {
  // X11: as séries marcadas de uma vez levam a hora (V14); as que já estavam feitas mantêm a delas
  const stamp = (set: SessionSet): SessionSet => {
    if (!done) { const { at: _a, ...rest } = set; return { ...rest, done: false }; }
    return set.done ? set : { ...set, done: true, ...(now ? { at: now.toISOString() } : {}) };
  };
  return mapExercise(s, exIndex, ex => ({
    ...ex,
    sets: ex.sets.map(stamp),
    ...(ex.cardio ? { cardio: { ...ex.cardio, done } } : {})
  }));
}

export function updateCardio(s: ActiveSession, exIndex: number, patch: Partial<{ minutes: number; km: number; done: boolean; level: number }>): ActiveSession {
  return mapExercise(s, exIndex, ex => {
    if (!ex.cardio) return ex;
    const level = patch.level !== undefined ? clamp(Math.round(patch.level), 0, 30) : ex.cardio.level;
    return {
      ...ex,
      cardio: {
        minutes: patch.minutes !== undefined ? clamp(Math.round(patch.minutes), 0, 600) : ex.cardio.minutes,
        km: patch.km !== undefined ? clamp(round1(patch.km), 0, 300) : ex.cardio.km,
        done: patch.done ?? ex.cardio.done,
        ...(level ? { level } : {})
      }
    };
  });
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
    // V8: a rampa automática é refeita a partir da carga nova, não somada
    // T23: com a pilha da máquina, cada toque anda um pino (para cima ou para baixo)
    const next = (w: number) => (ex.stack?.length ? snapStack(w, ex.stack, delta > 0 ? 'up' : 'down') : roundKg(Math.max(0, w + delta)));
    const moved = ex.sets.map(set => (set.done || (set.kind === 'warmup' && set.auto) ? set : { ...set, weight: next(set.weight) }));
    return refreshAutoWarmup({ ...ex, sets: moved });
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
    if (ex.restSeconds !== undefined) swapped.restSeconds = ex.restSeconds;
    if (ex.tip) swapped.tip = ex.tip;
    if (ex.superset) swapped.superset = ex.superset;
    if (mode === 'cardio') swapped.cardio = { minutes: planEx?.minutes || 20, km: 0, done: false };
    return withAutoWarmup(swapped, data.settings);
  });
}
