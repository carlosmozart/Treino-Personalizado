import { describe, expect, it } from 'vitest';
import { exportPlan, readPlanFile } from './plan-share';
import { workoutAsText } from './workout-text';
import { weeklyWeights } from './home';
import { planExercise, samplePlan, workout } from './testing';
import type { Workout } from './model';

let n = 0;
const id = (p: string) => `${p}-${++n}`;

describe('compartilhar plano (M23)', () => {
  it('ida e volta: mesmas rotinas, ids novos, cargas zeradas por padrão', () => {
    const p = samplePlan(k => (k === 'SEG' ? [planExercise('e1', 'Supino Reto', { weight: 60, repMin: 8, repMax: 12, superset: 's1' })] : []));
    const file = JSON.stringify(exportPlan(p, false));
    expect(file).not.toContain('"id"');
    const r = readPlanFile(file, '2026-10-12', id);
    if (!('plan' in r)) throw new Error(r.error);
    const ex = r.plan.days.SEG.exercises[0]!;
    expect(ex).toMatchObject({ name: 'Supino Reto', weight: 0, repMin: 8, repMax: 12, superset: 's1' });
    expect(ex.id).not.toBe('e1');
    expect(r.plan.createdAt).toBe('2026-10-12');
  });

  it('com as cargas, se pedido', () => {
    const p = samplePlan(() => [planExercise('e1', 'Supino Reto', { weight: 60 })]);
    const r = readPlanFile(JSON.stringify(exportPlan(p, true)), '2026-10-12', id);
    expect('plan' in r && r.plan.days.SEG.exercises[0]!.weight).toBe(60);
  });

  it('recusa arquivos que não são plano e corrige valores impossíveis', () => {
    expect(readPlanFile('não é json', '2026-10-12', id)).toHaveProperty('error');
    expect(readPlanFile(JSON.stringify({ app: 'treino-personalizado', data: {} }), '2026-10-12', id)).toHaveProperty('error');
    const bad = { kind: 'treino-personalizado/plano', version: 1, plan: { name: 'X', days: { SEG: { exercises: [{ name: 'Supino', sets: 9999, reps: -5, weight: 1e9, mode: 'hack' }] } } } };
    const r = readPlanFile(JSON.stringify(bad), '2026-10-12', id);
    if (!('plan' in r)) throw new Error(r.error);
    expect(r.plan.days.SEG.exercises[0]).toMatchObject({ sets: 20, reps: 0, weight: 999, mode: 'reps' });
    expect(r.plan.days.TER.exercises).toEqual([]);
  });

  it('plano vazio é recusado', () => {
    const empty = { kind: 'treino-personalizado/plano', version: 1, plan: { name: 'Vazio', days: {} } };
    expect(readPlanFile(JSON.stringify(empty), '2026-10-12', id)).toHaveProperty('error');
  });
});

describe('treino como texto (M33)', () => {
  it('cabeçalho, séries e cardio', () => {
    const w: Workout = { ...workout('2026-10-10', 'Supino Reto', [[10, 60], [8, 62.5]]), dayName: 'Treino A', durationMin: 65 };
    w.entries[0]!.sets[1]!.failure = true;
    w.entries.push({ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 20, km: 2.5 } });
    expect(workoutAsText(w)).toBe('Treino A · 10/10/2026 · 65 min\nSupino Reto: 60×10, 62,5×8 (falha)\nEsteira: 20 min · 2,5 km');
  });
});

describe('peso por semana (M38)', () => {
  it('média por semana e variação', () => {
    const w = weeklyWeights([
      { date: '2026-09-28', weight: 70 }, { date: '2026-10-01', weight: 69 },
      { date: '2026-10-05', weight: 68.4 }, { date: '2026-10-07', weight: 68.8 }, { date: '2026-10-09', weight: 68.5 }
    ]);
    expect(w).toEqual([
      { monday: '2026-09-28', count: 2, average: 69.5, change: null },
      { monday: '2026-10-05', count: 3, average: 68.6, change: -0.9 }
    ]);
  });
});
