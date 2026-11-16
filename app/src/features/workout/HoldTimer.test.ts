// O cronômetro da prancha só vale para o treino e o exercício em que começou.
import { expect, test } from 'vitest';
import { pauseSession, startSession, toggleSet } from '../../domain/session';
import { planExercise, sampleData, samplePlan } from '../../domain/testing';
import { holdIsValid } from './HoldTimer';

const NOW = new Date(2026, 10, 16, 10);
const data = () => sampleData({ plans: { p1: samplePlan(() => [planExercise('p', 'Prancha', { mode: 'time', seconds: 30 }), planExercise('s', 'Supino Reto')]) } });

test('vale no mesmo treino, com a série ainda por fazer', () => {
  const s = startSession(data(), 'p1', 'SEG', NOW, 'treino-1')!;
  const hold = { sessionId: 'treino-1', exKey: s.exercises[0]!.key, ex: 0, set: 0 };
  expect(holdIsValid(hold, s)).toBe(true);
  // outro treino (o anterior foi cancelado ou concluído): não vale, e nada é marcado sozinho
  expect(holdIsValid(hold, startSession(data(), 'p1', 'SEG', NOW, 'treino-2'))).toBe(false);
  expect(holdIsValid(hold, null)).toBe(false);
  // pausado, série já marcada ou exercício fora do lugar
  expect(holdIsValid(hold, pauseSession(s, NOW))).toBe(false);
  expect(holdIsValid(hold, toggleSet(s, 0, 0))).toBe(false);
  expect(holdIsValid({ ...hold, ex: 1 }, s)).toBe(false);
});
