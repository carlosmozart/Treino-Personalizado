// Edição do plano (N10, O3, O8, O25): funções puras sobre o plano e uma ação que grava e carimba.
import { DAY_KEYS, type DayKey } from './ai-plan';
import { toDateKey } from './dates';
import { newId } from './ids';
import { MAX_EXERCISES_PER_DAY, type AppData, type Plan, type PlanDay, type PlanExercise } from './model';
import { key, tombstone, touch } from './sync';
import { isCardioName } from '../data/exercise-library';
import type { ActionResult } from './actions';

export function newPlanExercise(name: string, id = newId('ex')): PlanExercise {
  const cardio = isCardioName(name);
  return {
    id, name: name.trim(), mode: cardio ? 'cardio' : 'reps', sets: cardio ? 1 : 3, reps: 10, weight: 0,
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

export function updateExercise(plan: Plan, dayKey: DayKey, id: string, patch: Partial<Omit<PlanExercise, 'id'>>): Plan {
  return mapDay(plan, dayKey, day => ({ ...day, exercises: day.exercises.map(e => (e.id === id ? { ...e, ...patch } : e)) }));
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
