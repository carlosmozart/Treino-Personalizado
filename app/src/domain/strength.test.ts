import { expect, test } from 'vitest';
import { bestE1rm, e1rm, recordKinds, weightForReps } from './strength';
import { workout } from './testing';

test('1RM estimado (Epley), só até 12 reps', () => {
  expect(e1rm(100, 1)).toBe(100);
  expect(e1rm(95, 8)).toBe(120.3);
  expect(e1rm(60, 15)).toBeNull();
  expect(e1rm(0, 5)).toBeNull();
  expect(weightForReps(120, 10)).toBe(90);
  expect(bestE1rm(workout('d', 'Supino', [[1, 100], [8, 95]]).entries[0]!)?.set).toEqual({ reps: 8, weight: 95, kind: 'work' });
});

test('recordes: 95×8 bate 1RM de 100×1, carga separada, volume separado; primeira sessão não conta', () => {
  const a = workout('2026-10-01', 'Supino', [[1, 100]], 'a');
  const b = workout('2026-10-05', 'Supino', [[8, 95], [8, 95]], 'b');
  const c = workout('2026-10-08', 'Supino', [[1, 105]], 'c');
  const all = [a, b, c];
  expect(recordKinds(all, a, a.entries[0]!)).toEqual([]);
  expect(recordKinds(all, b, b.entries[0]!)).toEqual(['e1rm', 'volume']);
  expect(recordKinds(all, c, c.entries[0]!)).toEqual(['weight']);
});
