import { expect, test } from 'vitest';
import { markBigWeightJump } from './actions';
import { adjustWeights, startSession, swapExercise, toggleSet } from './session';
import { suspiciousWeight } from './workouts';
import { sampleData, workout } from './testing';

const NOW = new Date(2026, 9, 5, 9); // segunda

function session() {
  const data = sampleData();
  return { data, s: startSession(data, 'p1', 'SEG', NOW, 's1')! };
}

test('ajuste de carga só nas séries não feitas, sem ficar negativo', () => {
  const { s } = session();
  let next = toggleSet(s, 0, 0);
  next = adjustWeights(next, 0, 5);
  expect(next.exercises[0]!.sets.map(x => x.weight)).toEqual([20, 25, 25]);
  expect(adjustWeights(next, 0, -100).exercises[0]!.sets.map(x => x.weight)).toEqual([20, 0, 0]);
});

test('troca por qualquer exercício da biblioteca, cardio pelo nome, e volta ao original', () => {
  const { data, s } = session();
  const swapped = swapExercise(s, data, 0, 'Esteira');
  expect(swapped.exercises[0]).toMatchObject({ name: 'Esteira', mode: 'cardio', swappedFrom: 'Supino Reto' });
  const free = swapExercise(s, data, 0, 'Supino na Máquina X');
  expect(free.exercises[0]).toMatchObject({ name: 'Supino na Máquina X', mode: 'reps' });
  const back = swapExercise(free, data, 0, 'Supino Reto');
  expect(back.exercises[0]!.name).toBe('Supino Reto');
  expect(back.exercises[0]!.swappedFrom).toBeUndefined();
  expect(swapExercise(s, data, 0, '  ')).toBe(s);
});

test('carga suspeita: dígito a mais com sugestão; progressão ousada passa', () => {
  const ws = [workout('2026-10-01', 'Supino', [[10, 60]])];
  expect(suspiciousWeight(ws, 'supino', 85)).toBeNull();
  expect(suspiciousWeight(ws, 'supino', 600)).toEqual({ max: 60, suggestion: 60 });
  expect(suspiciousWeight(ws, 'supino', 2000)).toEqual({ max: 60, suggestion: null });
  expect(suspiciousWeight([], 'supino', 120)).toBeNull();
  expect(suspiciousWeight([], 'supino', 800)).toEqual({ max: 0, suggestion: 80 });
});

test('Rock Lee: marca uma vez', () => {
  const data = sampleData();
  const next = markBigWeightJump(data).data;
  expect(next.gamification.bigWeightJump).toBe(true);
  expect(markBigWeightJump(next).data).toBe(next);
});
