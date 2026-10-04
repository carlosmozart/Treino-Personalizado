import { expect, test } from 'vitest';
import { goalProgress, numericFieldError, recordGoalCheckpoints, weightTrend, type BodyField, type WeightGoal } from './body-goal';

test('preserva datas de conquista após oscilação sem modificar a meta original', () => {
  const original: WeightGoal = { startWeight: 100, targetWeight: 80, startedAt: '2026-01-01' };
  const first = recordGoalCheckpoints(original, 90, '2026-09-10');
  expect(first.checkpoints).toEqual({ 25: '2026-09-10', 50: '2026-09-10' });
  const back = recordGoalCheckpoints(first, 98, '2026-09-11');
  expect(back.checkpoints).toEqual(first.checkpoints);
  expect(recordGoalCheckpoints(back, 80, '2026-09-20').checkpoints)
    .toEqual({ 25: '2026-09-10', 50: '2026-09-10', 75: '2026-09-20', 100: '2026-09-20' });
  expect(original.checkpoints).toBeUndefined();
});

test('média móvel usa no máximo sete pesagens válidas sem alterar os dados', () => {
  const entries = [80, 82, 84, 86, 88, 90, 92, 94].map(weight => ({ weight }));
  const trend = weightTrend(entries);
  expect(trend[0]!.trend).toBe(80);
  expect(trend[1]!.trend).toBe(81);
  expect(trend[6]!.trend).toBe(86);
  expect(trend[7]!.trend).toBe(88);
  expect(trend[7]!.trendCount).toBe(7);
  expect(entries[0]).toEqual({ weight: 80 });
  expect(weightTrend([{ weight: -1 }, { weight: 'abc' }, { weight: '70' }])[0]!.trend).toBe(70);
});

test('calcula os checkpoints de peso e limita o progresso', () => {
  const goal = goalProgress(100, 90, 80)!;
  expect(goal.percent).toBe(50);
  expect(goal.checkpoints.map(p => p.weight)).toEqual([95, 90, 85, 80]);
  expect(goal.checkpoints.map(p => p.reached)).toEqual([true, true, false, false]);
  expect(goalProgress(100, 105, 80)!.percent).toBe(0);
  expect(goalProgress(100, 75, 80)!.percent).toBe(100);
  expect(goalProgress(60, 65, 80)!.percent).toBe(25);
  expect(goalProgress(80, 85, 80)!.percent).toBe(0);
  expect(goalProgress(80, 80, 80)!.checkpoints).toEqual([]);
  expect(goalProgress(0, 80, 80)).toBeNull();
});

test.each<BodyField>(['height', 'weight', 'targetWeight', 'bodyFatPercent'])('valida números do perfil: %s', field => {
  for (const value of ['-1', '0', 'NaN', 'Infinity', 'abc', ' ']) expect(numericFieldError(field, value)).not.toBe('');
  for (const value of ['', '25', '25.5']) expect(numericFieldError(field, value)).toBe('');
  if (field === 'bodyFatPercent') {
    expect(numericFieldError(field, '100')).not.toBe('');
    expect(numericFieldError(field, '101')).not.toBe('');
  }
});
