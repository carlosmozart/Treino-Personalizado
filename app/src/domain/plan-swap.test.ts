// Trocar um exercício do plano por outro sem apagar e montar de novo.
import { describe, expect, it } from 'vitest';
import type { PlanExercise, Workout } from './model';
import { newPlanExercise } from './plan-edit';
import { replacePlanExercise, swapInPlan } from './plan-swap';
import { sampleData } from './testing';

const cavalinho = (): PlanExercise => ({
  ...newPlanExercise('Remada Cavalinho', 'ex1'),
  sets: 4, reps: 12, repMin: 8, repMax: 12, weight: 40, increment: 2.5, restSeconds: 120, superset: 'ss1', optional: true,
  lockWeight: true, tip: 'pegada neutra', stack: [10, 20, 30], warmupSets: 1,
  alternatives: [{ name: 'Remada Curvada (Barra)', mode: 'reps' }, { name: 'Remada Máquina', mode: 'reps' }]
});

const workout = (date: string, name: string, weights: number[]): Workout => ({
  id: `w-${date}`, date, startedAt: `${date}T18:00:00.000Z`, endedAt: `${date}T19:00:00.000Z`, durationMin: 60, source: 'app',
  entries: [{ key: name.toLowerCase(), name, mode: 'reps', sets: weights.map(w => ({ reps: 10, weight: w, kind: 'work' as const })) }]
} as Workout);

describe('trocar exercício no plano', () => {
  it('fica o lugar no treino (séries, faixa, descanso, superset); sai o que era do exercício antigo', () => {
    const next = replacePlanExercise(cavalinho(), 'Remada Curvada (Barra)', { workouts: [] });
    expect(next).toMatchObject({
      id: 'ex1', name: 'Remada Curvada (Barra)', mode: 'reps', sets: 4, repMin: 8, repMax: 12, restSeconds: 120,
      superset: 'ss1', optional: true, increment: 2.5, warmupSets: 1, weight: 0
    });
    for (const k of ['lockWeight', 'tip', 'stack', 'perSide'] as const) expect(next).not.toHaveProperty(k);
  });

  it('o antigo vira reserva, e o novo sai das reservas', () => {
    const next = replacePlanExercise(cavalinho(), '  Remada   Curvada (Barra) ', { workouts: [] });
    expect(next.name).toBe('Remada Curvada (Barra)');
    expect(next.alternatives.map(a => a.name)).toEqual(['Remada Cavalinho', 'Remada Máquina']);
  });

  it('a carga vem da última vez que o novo foi feito (sem o aquecimento)', () => {
    const w = workout('2026-11-20', 'Remada Curvada (Barra)', [50, 52.5]);
    w.entries[0]!.key = 'remada curvada (barra)';
    w.entries[0]!.sets.unshift({ reps: 10, weight: 70, kind: 'warmup' });
    expect(replacePlanExercise(cavalinho(), 'Remada Curvada (Barra)', { workouts: [w] }).weight).toBe(52.5);
  });

  it('mesmo nome ou nome vazio: nada muda; cardio vira cardio', () => {
    const ex = cavalinho();
    expect(replacePlanExercise(ex, 'remada cavalinho', { workouts: [] })).toBe(ex);
    expect(replacePlanExercise(ex, '  ', { workouts: [] })).toBe(ex);
    expect(replacePlanExercise(ex, 'Esteira', { workouts: [] })).toMatchObject({ mode: 'cardio', weight: 0 });
  });

  it('no plano: troca só aquele exercício, do dia certo', () => {
    const data = sampleData();
    const plan = data.plans.p1!;
    const dayKey = (Object.keys(plan.days) as (keyof typeof plan.days)[]).find(k => plan.days[k].exercises.length > 1)!;
    const [a, b] = plan.days[dayKey].exercises;
    const next = swapInPlan(plan, dayKey, a!.id, 'Remada Curvada (Barra)', data);
    expect(next.days[dayKey].exercises[0]!.name).toBe('Remada Curvada (Barra)');
    expect(next.days[dayKey].exercises[1]).toBe(b);
    expect(swapInPlan(plan, dayKey, 'nao-existe', 'X', data)).toBe(plan);
  });
});
