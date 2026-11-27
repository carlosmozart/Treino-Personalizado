// Trocar um exercício do plano por outro (ex.: Remada Cavalinho → Remada Curvada) sem apagar e
// montar de novo: fica o lugar no dia, as séries, as repetições, o descanso e o superset.
import { isCardioName } from '../data/exercise-library';
import type { DayKey } from './ai-plan';
import type { AppData, Plan, PlanExercise } from './model';
import { normalizeExerciseName } from './text';
import { lastSessionBefore } from './workouts';

/** A maior carga de trabalho da última vez que o exercício foi feito (0 se nunca). */
function lastWorkWeight(data: Pick<AppData, 'workouts'>, name: string): number {
  const last = lastSessionBefore(data.workouts, normalizeExerciseName(name), '9999-12-31');
  if (!last) return 0;
  return Math.max(0, ...last.entry.sets.filter(s => s.kind !== 'warmup').map(s => s.weight));
}

/**
 * O exercício do plano com outro nome. Fica o que é do lugar no treino (séries, repetições,
 * descanso, superset, opcional, subida da carga); sai o que era do exercício antigo (carga, carga
 * travada, dica, por lado, pilha da máquina). A carga vem da última vez que o novo foi feito. O
 * antigo vira reserva, para voltar a ele no treino com um toque.
 */
export function replacePlanExercise(ex: PlanExercise, name: string, data: Pick<AppData, 'workouts'>): PlanExercise {
  const clean = name.trim().replace(/\s+/g, ' ');
  const key = normalizeExerciseName(clean);
  if (!clean || key === normalizeExerciseName(ex.name)) return ex;
  const mode = isCardioName(clean) ? 'cardio' : ex.mode === 'cardio' ? 'reps' : ex.mode;
  const { lockWeight: _l, tip: _t, perSide: _p, sideRestSeconds: _s, stack: _st, ...rest } = ex;
  const alternatives = [{ name: ex.name, mode: ex.mode }, ...ex.alternatives]
    .filter((a, i, all) => normalizeExerciseName(a.name) !== key && all.findIndex(b => normalizeExerciseName(b.name) === normalizeExerciseName(a.name)) === i);
  return {
    ...rest,
    name: clean,
    mode,
    weight: mode === 'reps' ? lastWorkWeight(data, clean) : 0,
    ...(mode === 'cardio' && ex.mode !== 'cardio' ? { minutes: ex.minutes || 20 } : {}),
    alternatives
  };
}

/** Troca o exercício `id` do dia no plano (sem mudança, devolve o mesmo plano). */
export function swapInPlan(plan: Plan, dayKey: DayKey, id: string, name: string, data: Pick<AppData, 'workouts'>): Plan {
  const day = plan.days[dayKey];
  const ex = day?.exercises.find(e => e.id === id);
  if (!day || !ex) return plan;
  const next = replacePlanExercise(ex, name, data);
  if (next === ex) return plan;
  return { ...plan, days: { ...plan.days, [dayKey]: { ...day, exercises: day.exercises.map(e => (e.id === id ? next : e)) } } };
}
