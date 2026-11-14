// Edição do plano (N10, O3, O8, O25): funções puras sobre o plano e uma ação que grava e carimba.
import { DAY_KEYS, type DayKey } from './ai-plan';
import { toDateKey } from './dates';
import { newId } from './ids';
import { MAX_EXERCISES_PER_DAY, type AppData, type Plan, type PlanDay, type PlanExercise, type Workout, type WorkoutEntry } from './model';
import { normalizeExerciseName } from './text';
import { key, tombstone, touch } from './sync';
import { isCardioName } from '../data/exercise-library';
import { dayKeyOf } from './model';
import { fromDateKey } from './dates';
import type { ActionResult } from './actions';

export function newPlanExercise(name: string, id = newId('ex'), start?: { sets?: number | undefined; reps?: number | undefined }): PlanExercise {
  const cardio = isCardioName(name);
  // W14: os números com que a pessoa gosta de começar (Perfil → Treino)
  const sets = Math.min(20, Math.max(1, Math.round(start?.sets ?? 3)));
  const reps = Math.min(100, Math.max(1, Math.round(start?.reps ?? 10)));
  return {
    id, name: name.trim(), mode: cardio ? 'cardio' : 'reps', sets: cardio ? 1 : sets, reps, weight: 0,
    minutes: cardio ? 20 : 0, km: 0, restSeconds: 90, optional: false, alternatives: []
  };
}

const mapDay = (plan: Plan, dayKey: DayKey, fn: (day: PlanDay) => PlanDay): Plan => {
  const day = plan.days[dayKey];
  const next = fn(day);
  return next === day ? plan : { ...plan, days: { ...plan.days, [dayKey]: next } };
};

export function updateDay(plan: Plan, dayKey: DayKey, patch: Partial<Omit<PlanDay, 'exercises'>>): Plan {
  return mapDay(plan, dayKey, day => ({ ...day, ...patch }));
}

/** Adiciona ao fim do dia; recusa (devolve o mesmo plano) acima do limite ou nome vazio. */
export function addExercise(plan: Plan, dayKey: DayKey, exercise: PlanExercise): Plan {
  if (!exercise.name.trim()) return plan;
  return mapDay(plan, dayKey, day => day.exercises.length >= MAX_EXERCISES_PER_DAY ? day : { ...day, exercises: [...day.exercises, exercise] });
}

/** Deslizar para a direita no plano (R2): cópia logo abaixo, com id novo. */
export function duplicateExercise(plan: Plan, dayKey: DayKey, id: string, newExId: string): Plan {
  return mapDay(plan, dayKey, day => {
    const at = day.exercises.findIndex(e => e.id === id);
    if (at < 0 || day.exercises.length >= MAX_EXERCISES_PER_DAY) return day;
    const exercises = [...day.exercises];
    exercises.splice(at + 1, 0, { ...structuredClone(day.exercises[at]!), id: newExId });
    return { ...day, exercises };
  });
}

/** Desfazer a remoção (R2): o exercício volta para a mesma posição. */
export function insertExercise(plan: Plan, dayKey: DayKey, index: number, exercise: PlanExercise): Plan {
  return mapDay(plan, dayKey, day => {
    if (day.exercises.length >= MAX_EXERCISES_PER_DAY || day.exercises.some(e => e.id === exercise.id)) return day;
    const exercises = [...day.exercises];
    exercises.splice(Math.min(Math.max(0, index), exercises.length), 0, exercise);
    return { ...day, exercises };
  });
}

/**
 * Um exercício feito vira exercício do plano: o número de séries de trabalho, as repetições e a
 * carga da melhor série. Cardio leva os minutos.
 */
export function entryToPlanExercise(e: WorkoutEntry, id: string = newId('ex')): PlanExercise {
  const ex = newPlanExercise(e.name, id);
  const sets = e.sets.filter(s => s.kind === 'work');
  if (e.mode === 'cardio') return { ...ex, mode: 'cardio', sets: 1, reps: 0, minutes: e.cardio?.minutes ?? 20, km: e.cardio?.km ?? 0 };
  const top = sets.reduce((b, s) => (!b || s.weight > b.weight || (s.weight === b.weight && s.reps > b.reps) ? s : b), sets[0]);
  if (e.mode === 'time') return { ...ex, mode: 'time', sets: Math.max(1, sets.length), reps: 0, seconds: top?.reps ?? 30, weight: top?.weight ?? 0 };
  const warmups = e.sets.filter(s => s.kind === 'warmup').length;
  // W1: repetições diferentes entre as séries viram a faixa (8, 10, 12 → 8–12)
  const reps = sets.map(s => s.reps).filter(r => r > 0);
  const range = reps.length && Math.min(...reps) !== Math.max(...reps) ? { repMin: Math.min(...reps), repMax: Math.max(...reps) } : {};
  return {
    ...ex, mode: 'reps', sets: Math.max(1, sets.length), reps: top?.reps ?? 10, weight: top?.weight ?? 0, ...range,
    ...(e.perSide ? { perSide: true } : {}), ...(warmups ? { warmupSets: Math.min(5, warmups) } : {})
  };
}

/**
 * W1: um plano novo com o treino feito no dia da semana em que foi feito (nome do plano e do dia
 * vêm do treino). Para ajustar depois no Plano.
 */
export function planFromWorkout(w: Workout, id: string, today: string, makeId: () => string = () => newId('ex')): Plan {
  const name = w.dayName?.trim() || 'Meu treino';
  const plan = blankPlan(id, today, name === 'Treino livre' ? 'Meu treino' : name);
  const day = dayKeyOf(fromDateKey(w.date));
  const built = workoutToPlanDay(w, makeId);
  return { ...plan, days: { ...plan.days, [day]: { ...built, name: built.name === 'Treino livre' ? 'Treino A' : built.name } } };
}

// ---- Durante o treino: o que mudou em relação ao plano (pergunta "Salvar no plano?") ----

/** Número de séries de trabalho diferente do plano: o que gravar. */
export function setsPatch(ex: Pick<PlanExercise, 'sets'>, workSets: number): Pick<PlanExercise, 'sets'> | null {
  const n = Math.max(1, Math.min(20, Math.round(workSets)));
  return n === ex.sets ? null : { sets: n };
}

/**
 * Repetições fora da faixa do plano: a faixa cresce até elas (8–12 e 15 → 8–15). Dentro da faixa
 * é a progressão andando, e não há o que perguntar.
 */
export function repsPatch(ex: Pick<PlanExercise, 'reps' | 'repMin' | 'repMax'>, reps: number): Pick<PlanExercise, 'reps' | 'repMin' | 'repMax'> | null {
  const r = Math.round(reps);
  if (!(r > 0)) return null;
  const min = ex.repMin && ex.repMin > 0 ? ex.repMin : ex.reps;
  const max = ex.repMax && ex.repMax >= min ? ex.repMax : Math.max(min, ex.reps);
  if (r >= min && r <= max) return null;
  // reps fixas (sem faixa): troca o número
  if (min === max && !ex.repMin && !ex.repMax) return { reps: r };
  const lo = Math.min(min, r), hi = Math.max(max, r);
  return { reps: hi, repMin: lo, repMax: hi };
}

/** Séries de aquecimento diferentes das do plano. */
export function warmupPatch(ex: Pick<PlanExercise, 'warmupSets'>, warmups: number): Pick<PlanExercise, 'warmupSets'> | null {
  const n = Math.max(0, Math.min(5, Math.round(warmups)));
  return n === (ex.warmupSets ?? 0) ? null : { warmupSets: n };
}

/** Trava (com a carga dada) ou destrava a carga do exercício no plano. */
export function lockPatch(lock: boolean, weight?: number): Partial<PlanExercise> {
  return lock ? { lockWeight: true, ...(weight !== undefined ? { weight } : {}) } : { lockWeight: undefined };
}

/** Tira um exercício do dia do plano pelo id. */
export function removePlanExercise(plan: Plan, dayKey: DayKey, id: string): Plan {
  return mapDay(plan, dayKey, day => ({ ...day, exercises: day.exercises.filter(e => e.id !== id) }));
}

/** M33: um treino feito vira um dia do plano, exercício por exercício (entryToPlanExercise). */
export function workoutToPlanDay(w: Workout, makeId: () => string = () => newId('ex')): PlanDay {
  const exercises = w.entries.slice(0, MAX_EXERCISES_PER_DAY).map(e => entryToPlanExercise(e, makeId()));
  return { name: w.dayName?.trim() || 'Treino', focus: '', optional: false, exercises };
}

/**
 * T13 ("Novo neste treino"): exercícios acrescentados durante um treino do plano que ainda não
 * estão no dia de onde o treino veio. Sem o plano ou o dia, nada.
 */
export function addedEntries(plan: Plan | undefined, w: Workout): WorkoutEntry[] {
  const day = plan && w.planId === plan.id && w.dayKey ? plan.days[w.dayKey] : undefined;
  if (!day) return [];
  const inDay = new Set(day.exercises.map(e => normalizeExerciseName(e.name)));
  return w.entries.filter(e => e.added && !inDay.has(e.key));
}

/** T13: põe os exercícios no fim do dia do plano de onde o treino veio, como foram feitos. */
export function addEntriesToPlan(plan: Plan, w: Workout, keys: readonly string[], makeId: () => string = () => newId('ex')): Plan {
  if (!w.dayKey || w.planId !== plan.id) return plan;
  const entries = addedEntries(plan, w).filter(e => keys.includes(e.key));
  return entries.reduce((p, e) => addExercise(p, w.dayKey!, entryToPlanExercise(e, makeId())), plan);
}

export function updateExercise(plan: Plan, dayKey: DayKey, id: string, patch: Partial<Omit<PlanExercise, 'id'>>): Plan {
  return mapDay(plan, dayKey, day => ({
    ...day,
    exercises: day.exercises.map(e => {
      if (e.id !== id) return e;
      const next = { ...e, ...patch };
      // campos opcionais desligados saem do registro (exactOptionalPropertyTypes)
      for (const k of ['lockWeight', 'warmupSets'] as const) if (next[k] === undefined || next[k] === 0) delete next[k];
      return next;
    })
  }));
}

/** Descanso do exercício no plano: `undefined` = o padrão do app, 0 = sem cronômetro. */
export function setPlanExerciseRest(plan: Plan, dayKey: DayKey, id: string, seconds: number | undefined): Plan {
  return mapDay(plan, dayKey, day => {
    const ex = day.exercises.find(e => e.id === id);
    if (!ex || ex.restSeconds === seconds) return day;
    const { restSeconds: _old, ...rest } = ex;
    const next: PlanExercise = seconds === undefined ? rest : { ...rest, restSeconds: Math.min(600, Math.max(0, Math.round(seconds))) };
    return { ...day, exercises: day.exercises.map(e => (e.id === id ? next : e)) };
  });
}

export function removeExercise(plan: Plan, dayKey: DayKey, id: string): Plan {
  return mapDay(plan, dayKey, day => (day.exercises.some(e => e.id === id) ? { ...day, exercises: day.exercises.filter(e => e.id !== id) } : day));
}

/** Move um exercício uma posição (−1 sobe, +1 desce). */
export function moveExercise(plan: Plan, dayKey: DayKey, id: string, delta: -1 | 1): Plan {
  return mapDay(plan, dayKey, day => {
    const from = day.exercises.findIndex(e => e.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= day.exercises.length) return day;
    const exercises = [...day.exercises];
    [exercises[from], exercises[to]] = [exercises[to]!, exercises[from]!];
    return { ...day, exercises };
  });
}

/** Transforma o dia em descanso (sem exercícios, nome e foco limpos). */
export function clearDay(plan: Plan, dayKey: DayKey): Plan {
  return mapDay(plan, dayKey, day => (day.exercises.length || day.name || day.focus ? { name: '', focus: '', optional: false, exercises: [] } : day));
}

/** Texto do "dia opcional" que descreve o estado atual (O8). */
export function optionalHint(optional: boolean): string {
  return optional
    ? 'Dia opcional: se não treinar, sua sequência continua.'
    : 'Dia obrigatório: se não treinar, sua sequência é zerada.';
}

/** Grava uma edição do plano; sem mudança, nada é carimbado. */
export function editPlan(data: AppData, planId: string, edit: (plan: Plan) => Plan, now: Date): ActionResult {
  const plan = data.plans[planId];
  if (!plan) return { data, events: [] };
  const next = edit(plan);
  if (next === plan) return { data, events: [] };
  const draft: AppData = {
    ...data, plans: { ...data.plans, [planId]: { ...next, updatedAt: toDateKey(now) } },
    sync: { changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } }
  };
  touch(draft, key.plan(planId), now);
  return { data: draft, events: [] };
}

/** Apaga um plano que não está ativo. */
export function deletePlan(data: AppData, planId: string, now: Date): ActionResult {
  if (!data.plans[planId] || data.activePlanId === planId) return { data, events: [] };
  const plans = { ...data.plans };
  delete plans[planId];
  const draft: AppData = { ...data, plans, sync: { changed: { ...data.sync.changed }, deleted: { ...data.sync.deleted } } };
  tombstone(draft, key.plan(planId), now);
  return { data: draft, events: [] };
}

/** Plano vazio: todos os dias de descanso. */
export function blankPlan(id: string, today: string, name = 'Novo plano'): Plan {
  const rest = (): PlanDay => ({ name: '', focus: '', optional: false, exercises: [] });
  const days = Object.fromEntries(DAY_KEYS.map(k => [k, rest()])) as Plan['days'];
  return { id, name, description: '', trainingTime: '', createdAt: today, updatedAt: today, days };
}

/** O que a pessoa escolhe ao criar um plano do zero. */
export interface ScratchChoice {
  name: string;
  /** Dias em que vai treinar (na rotação, só dão a meta por semana). */
  days: readonly DayKey[];
  rotation: boolean;
}

const SCRATCH_LETTERS = 'ABCDEFG';

/**
 * Plano do zero já com a forma escolhida: na semana fixa, os dias de treino nascem com nome
 * ("Treino A", "Treino B"…) e vazios, esperando os exercícios; na rotação, com a meta da semana.
 */
export function scratchPlan(id: string, today: string, choice: ScratchChoice): Plan {
  const plan = blankPlan(id, today, choice.name.trim().slice(0, 80) || 'Meu treino');
  const days = DAY_KEYS.filter(k => choice.days.includes(k));
  if (choice.rotation) return { ...plan, rotation: { order: [], perWeek: Math.min(7, Math.max(1, days.length || 3)) } };
  return { ...plan, days: Object.fromEntries(DAY_KEYS.map(k => {
    const i = days.indexOf(k);
    return [k, i >= 0 ? { ...plan.days[k], name: `Treino ${SCRATCH_LETTERS[i]}` } : plan.days[k]];
  })) as Plan['days'] };
}

/** Dia escolhido para treinar que ainda não tem exercícios (o plano do zero começa assim). */
export const isPlannedEmpty = (day: PlanDay) => day.exercises.length === 0 && day.name.trim() !== '';

/** Cópia independente de um plano (exercícios com ids novos). */
export function duplicatePlan(plan: Plan, id: string, today: string, makeId: () => string = () => newId('ex')): Plan {
  const days = Object.fromEntries(DAY_KEYS.map(k => [k, {
    ...plan.days[k], exercises: plan.days[k].exercises.map(e => ({ ...structuredClone(e), id: makeId() }))
  }])) as Plan['days'];
  return { ...plan, id, name: `Cópia de ${plan.name}`, createdAt: today, updatedAt: today, days };
}

/** Reserva (exercício para trocar no treino); sem nome vazio nem repetida. */
export function addAlternative(plan: Plan, dayKey: DayKey, id: string, name: string): Plan {
  const clean = name.trim();
  return mapDay(plan, dayKey, day => {
    const ex = day.exercises.find(e => e.id === id);
    if (!ex || !clean || ex.alternatives.some(a => a.name.toLowerCase() === clean.toLowerCase())) return day;
    return { ...day, exercises: day.exercises.map(e => e.id === id ? { ...e, alternatives: [...e.alternatives, { name: clean, mode: isCardioName(clean) ? 'cardio' as const : e.mode }] } : e) };
  });
}

export function removeAlternative(plan: Plan, dayKey: DayKey, id: string, index: number): Plan {
  return mapDay(plan, dayKey, day => ({
    ...day, exercises: day.exercises.map(e => e.id === id ? { ...e, alternatives: e.alternatives.filter((_, i) => i !== index) } : e)
  }));
}
