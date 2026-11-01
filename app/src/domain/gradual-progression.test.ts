// Ajustes de 01/11/2026: descanso por exercício, reps no começo da faixa e progressão mais gradual.
import { describe, expect, it } from 'vitest';
import type { Workout } from './model';
import { setPlanExerciseRest } from './plan-edit';
import { incrementFor, MIN_DAYS_BETWEEN_UPS, suggestProgression } from './progression';
import { restAfterSet, setExerciseRest, startSession } from './session';
import { planExercise, sampleData, workout } from './testing';

const range = { sets: 3, reps: 12, repMin: 8, repMax: 12, weight: 0 };
const top = (date: string, w: number, name = 'Elevação Lateral') => workout(date, name, [[12, w], [12, w], [12, w]]);

describe('progressão mais gradual', () => {
  it('degrau automático: 1 kg abaixo de 20 kg, 2,5 kg a partir daí; o escolhido vale sempre', () => {
    expect(incrementFor({}, 8)).toBe(1);
    expect(incrementFor({}, 19.5)).toBe(1);
    expect(incrementFor({}, 20)).toBe(2.5);
    expect(incrementFor({ increment: 5 }, 8)).toBe(5);
  });

  it('halter leve no topo sobe 1 kg, não 2,5', () => {
    expect(suggestProgression([top('2026-10-01', 6)], 'elevação lateral', range, '2026-10-10')).toMatchObject({ kind: 'up', weight: 7, reps: 8 });
  });

  it('no máximo uma subida por semana: subiu na segunda, chegou ao topo na quinta, mantém', () => {
    const hist = [top('2026-10-01', 6), top('2026-10-05', 7)];
    const thu = suggestProgression(hist, 'elevação lateral', range, '2026-10-08');
    expect(thu).toMatchObject({ kind: 'keep', weight: 7 });
    expect(thu?.reason).toContain('Sobe a partir de 12/10');
    // uma semana depois da carga nova, sobe
    expect(suggestProgression(hist, 'elevação lateral', range, '2026-10-12')).toMatchObject({ kind: 'up', weight: 8 });
    expect(MIN_DAYS_BETWEEN_UPS).toBe(7);
  });

  it('treinando 2× por semana por 4 semanas, sempre no topo, a carga sobe 1 kg por semana', () => {
    const dates = ['2026-10-05', '2026-10-08', '2026-10-12', '2026-10-15', '2026-10-19', '2026-10-22', '2026-10-26', '2026-10-29'];
    const hist: Workout[] = [];
    let w = 5;
    for (const date of dates) {
      const s = suggestProgression(hist, 'elevação lateral', { ...range, weight: 5 }, date)!;
      w = s.weight;
      hist.push(top(date, w));
    }
    // 5 → 6 → 7 → 8: uma subida por semana, nunca duas
    expect(hist.map(h => h.entries[0]!.sets[0]!.weight)).toEqual([5, 5, 6, 6, 7, 7, 8, 8]);
  });

  it('ficar no começo da faixa por semanas não vira deload', () => {
    const hist = ['2026-10-05', '2026-10-12', '2026-10-19'].map(d => workout(d, 'Supino', [[8, 30], [8, 30], [8, 30]]));
    expect(suggestProgression(hist, 'supino', range, '2026-10-26')).toMatchObject({ kind: 'keep', weight: 30, reps: 8 });
  });
});

describe('repetições no começo da faixa', () => {
  it('o treino abre com 8 numa faixa de 8 a 12, também sem histórico', () => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('e1', 'Supino', { reps: 12, repMin: 8, repMax: 12, weight: 30 })];
    expect(startSession(d, 'p1', 'QUA', new Date(2026, 9, 7, 10), 's1')!.exercises[0]!.sets.map(s => s.reps)).toEqual([8, 8, 8]);
  });

  it('sem faixa, as reps do plano', () => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('e1', 'Supino', { reps: 10, weight: 30 })];
    expect(startSession(d, 'p1', 'QUA', new Date(2026, 9, 7, 10), 's1')!.exercises[0]!.sets[0]!.reps).toBe(10);
  });
});

describe('descanso por exercício', () => {
  const settings = { restSeconds: 90 };

  it('0 no plano é sem cronômetro (antes caía no padrão)', () => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('e1', 'Alongamento', { restSeconds: 0 })];
    const ex = startSession(d, 'p1', 'QUA', new Date(2026, 9, 7, 10), 's1')!.exercises[0]!;
    expect(ex.restSeconds).toBe(0);
    expect(restAfterSet(ex, 0, settings)).toBe(0);
  });

  it('mudar no treino: um tempo próprio, sem cronômetro ou de volta ao padrão', () => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('e1', 'Agachamento', { restSeconds: 90 })];
    let s = startSession(d, 'p1', 'QUA', new Date(2026, 9, 7, 10), 's1')!;
    s = setExerciseRest(s, 0, 180);
    expect(restAfterSet(s.exercises[0]!, 0, settings)).toBe(180);
    s = setExerciseRest(s, 0, 0);
    expect(restAfterSet(s.exercises[0]!, 0, settings)).toBe(0);
    s = setExerciseRest(s, 0, undefined);
    expect(s.exercises[0]!.restSeconds).toBeUndefined();
    expect(restAfterSet(s.exercises[0]!, 0, { restSeconds: 75 })).toBe(75);
    expect(setExerciseRest(s, 0, undefined)).toBe(s);
  });

  it('guardar no plano', () => {
    const d = sampleData();
    d.plans.p1!.days.QUA.exercises = [planExercise('e1', 'Agachamento', { restSeconds: 90 })];
    const p = setPlanExerciseRest(d.plans.p1!, 'QUA', 'e1', 150);
    expect(p.days.QUA.exercises[0]!.restSeconds).toBe(150);
    expect('restSeconds' in setPlanExerciseRest(p, 'QUA', 'e1', undefined).days.QUA.exercises[0]!).toBe(false);
    expect(setPlanExerciseRest(p, 'QUA', 'e1', 150)).toBe(p);
  });
});
