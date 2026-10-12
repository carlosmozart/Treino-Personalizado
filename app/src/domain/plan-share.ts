// M23: compartilhar um plano por arquivo. Só as rotinas: nada de histórico, peso ou perfil.
// O arquivo vem de outra pessoa, então a leitura confere tudo e recria os ids.
import { DAY_KEYS, type DayKey } from './ai-plan';
import type { DateKey } from './dates';
import { MAX_EXERCISES_PER_DAY, type ExerciseMode, type Plan, type PlanDay, type PlanExercise } from './model';

export const PLAN_FILE_KIND = 'treino-personalizado/plano';

export interface PlanFile { kind: typeof PLAN_FILE_KIND; version: 1; plan: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'> }

/** Arquivo do plano. Sem `withLoads`, as cargas saem zeradas (cada pessoa tem a sua). */
export function exportPlan(plan: Plan, withLoads: boolean): PlanFile {
  const days = Object.fromEntries(DAY_KEYS.map(k => [k, {
    ...plan.days[k],
    // ids ficam de fora: a importação cria outros
    exercises: plan.days[k].exercises.map(({ id: _id, ...e }) => ({ ...e, weight: withLoads ? e.weight : 0 }))
  }])) as unknown as Record<DayKey, PlanDay>;
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = plan;
  return { kind: PLAN_FILE_KIND, version: 1, plan: { ...rest, days } };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown, min: number, max: number, dflt: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : dflt;
const MODES: readonly ExerciseMode[] = ['reps', 'time', 'cardio'];

/** Lê o arquivo e devolve um plano novo (ids novos), ou o motivo de recusa. */
export function readPlanFile(text: string, today: DateKey, makeId: (prefix: string) => string): { plan: Plan } | { error: string } {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { error: 'O arquivo não é um plano válido.' }; }
  if (!isObj(raw) || raw.kind !== PLAN_FILE_KIND || !isObj(raw.plan) || !isObj(raw.plan.days)) {
    return { error: 'Este arquivo não é um plano do Treino Personalizado. Para restaurar um backup, use Perfil → Dados e backup.' };
  }
  const p = raw.plan;
  const days = {} as Record<DayKey, PlanDay>;
  let total = 0;
  for (const k of DAY_KEYS) {
    const d = isObj((p.days as Record<string, unknown>)[k]) ? (p.days as Record<string, Record<string, unknown>>)[k]! : {};
    const list = Array.isArray(d.exercises) ? d.exercises.filter(isObj).slice(0, MAX_EXERCISES_PER_DAY) : [];
    const exercises: PlanExercise[] = list.flatMap(e => {
      const name = str(e.name, 80).trim();
      if (!name) return [];
      const mode = MODES.includes(e.mode as ExerciseMode) ? (e.mode as ExerciseMode) : 'reps';
      const ex: PlanExercise = {
        id: makeId('ex'), name, mode,
        sets: Math.round(num(e.sets, 1, 20, 3)), reps: Math.round(num(e.reps, 0, 100, 10)),
        weight: num(e.weight, 0, 999, 0), minutes: num(e.minutes, 0, 300, 0), km: num(e.km, 0, 200, 0),
        optional: e.optional === true,
        alternatives: Array.isArray(e.alternatives)
          ? e.alternatives.filter(isObj).map(a => ({ name: str(a.name, 80).trim(), mode: MODES.includes(a.mode as ExerciseMode) ? (a.mode as ExerciseMode) : 'reps' })).filter(a => a.name).slice(0, 5)
          : []
      };
      if (typeof e.seconds === 'number') ex.seconds = Math.round(num(e.seconds, 5, 600, 30));
      if (typeof e.restSeconds === 'number') ex.restSeconds = Math.round(num(e.restSeconds, 15, 600, 90));
      if (typeof e.repMin === 'number') ex.repMin = Math.round(num(e.repMin, 1, 100, ex.reps));
      if (typeof e.repMax === 'number') ex.repMax = Math.round(num(e.repMax, 1, 100, ex.reps));
      if (typeof e.increment === 'number') ex.increment = num(e.increment, 0.5, 10, 2.5);
      if (typeof e.superset === 'string' && e.superset) ex.superset = str(e.superset, 40);
      const tip = str(e.tip, 300).trim();
      if (tip) ex.tip = tip;
      return [ex];
    });
    total += exercises.length;
    days[k] = { name: str(d.name, 80), focus: str(d.focus, 120), optional: d.optional === true, exercises };
  }
  if (!total) return { error: 'O plano do arquivo não tem nenhum exercício.' };
  const plan: Plan = {
    id: makeId('plano'), name: str(p.name, 80).trim() || 'Plano compartilhado', description: str(p.description, 500),
    trainingTime: /^\d{1,2}:\d{2}$/.test(str(p.trainingTime, 5)) ? str(p.trainingTime, 5) : '', createdAt: today, updatedAt: today, days
  };
  if (p.progression === 'linear') plan.progression = 'linear';
  if (isObj(p.rotation) && Array.isArray(p.rotation.order)) {
    const order = p.rotation.order.filter((k): k is DayKey => DAY_KEYS.includes(k as DayKey));
    plan.rotation = { order, perWeek: Math.round(num(p.rotation.perWeek, 1, 7, Math.max(1, order.length))) };
  }
  return { plan };
}
