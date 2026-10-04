import { expect, test } from 'vitest';
import {
  addSet, completeExercise, removeSet, sessionProgress, sessionToWorkout, startSession, swapExercise,
  toggleSet, updateCardio, updateSet
} from './session';
import { planExercise, sampleData, samplePlan, workout } from './testing';

const MONDAY = new Date(2026, 9, 5, 10, 0);
const at = (minutes: number) => new Date(MONDAY.getTime() + minutes * 60000);

test('começa pelo plano e pré-preenche a carga da última sessão do exercício (pelo nome)', () => {
  const data = sampleData({ workouts: [workout('2026-10-02', 'Supino Reto', [[10, 40], [8, 42.5]])] });
  const s = startSession(data, 'p1', 'SEG', MONDAY, 's1')!;
  expect(s).toMatchObject({ id: 's1', date: '2026-10-05', planId: 'p1', dayKey: 'SEG', dayName: 'Treino SEG' });
  expect(s.exercises[0]!.sets).toEqual(Array(3).fill({ reps: 10, weight: 42.5, kind: 'work', done: false }));
  // sem histórico, usa a carga do plano
  expect(s.exercises[1]!.sets[0]).toMatchObject({ weight: 20 });
  expect(startSession(data, 'p1', 'DOM', MONDAY, 's2')).toBeNull();
  expect(startSession(data, 'nada', 'SEG', MONDAY, 's2')).toBeNull();
});

test('ações devolvem sessão nova e respeitam limites', () => {
  const s0 = startSession(sampleData(), 'p1', 'SEG', MONDAY, 's1')!;
  const s1 = updateSet(toggleSet(s0, 0, 1), 0, 1, { weight: 22.456, reps: -3 });
  expect(s0.exercises[0]!.sets[1]!.done).toBe(false);
  expect(s1.exercises[0]!.sets[1]).toEqual({ reps: 0, weight: 22.5, kind: 'work', done: true });
  const s2 = addSet(s1, 0);
  expect(s2.exercises[0]!.sets).toHaveLength(4);
  expect(s2.exercises[0]!.sets[3]).toMatchObject({ weight: 20, done: false });
  let one = s0;
  for (let i = 0; i < 5; i++) one = removeSet(one, 0, 0);
  expect(one.exercises[0]!.sets).toHaveLength(1);
  expect(toggleSet(s0, 9, 0)).toBe(s0);
});

test('progresso conta séries e exercícios; opcionais não seguram o check-in cheio', () => {
  const plan = samplePlan(() => [planExercise('a', 'Agachamento'), planExercise('c', 'Esteira', { mode: 'cardio', optional: true })]);
  const s0 = startSession(sampleData({ plans: { p1: plan } }), 'p1', 'SEG', MONDAY, 's1')!;
  expect(sessionProgress(toggleSet(s0, 0, 0))).toEqual({ exercisesDone: 0, exercisesTotal: 2, setsDone: 1, setsTotal: 3, complete: false });
  expect(sessionProgress(completeExercise(s0, 0)).complete).toBe(true);
});

test('vai para o histórico só o que foi marcado (O1), com duração', () => {
  const plan = samplePlan(() => [planExercise('a', 'Agachamento'), planExercise('b', 'Leg Press'), planExercise('c', 'Esteira', { mode: 'cardio' })]);
  let s = startSession(sampleData({ plans: { p1: plan } }), 'p1', 'SEG', MONDAY, 's1')!;
  expect(sessionToWorkout(s, at(30))).toBeNull();
  s = updateCardio(toggleSet(toggleSet(s, 0, 0), 0, 2), 2, { minutes: 25, km: 3.04 });
  const w1 = sessionToWorkout(s, at(50))!;
  expect(w1.entries.map(e => e.name)).toEqual(['Agachamento']);
  expect(w1.entries[0]!.sets).toHaveLength(2);
  expect(w1).toMatchObject({ durationMin: 50, source: 'app', dayKey: 'SEG', planId: 'p1' });
  const w2 = sessionToWorkout(updateCardio(s, 2, { done: true }), at(400))!;
  expect(w2.entries[1]).toEqual({ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 25, km: 3 } });
  expect(w2.durationMin).toBeUndefined(); // sessão esquecida aberta
});

test('troca pela reserva usa o histórico dela e volta ao original', () => {
  const plan = samplePlan(() => [planExercise('a', 'Supino Reto', { alternatives: [{ name: 'Supino com Halteres', mode: 'reps' }, { name: 'Bike', mode: 'cardio' }] })]);
  const data = sampleData({ plans: { p1: plan }, workouts: [workout('2026-10-01', 'Supino com Halteres', [[12, 18]])] });
  const s0 = startSession(data, 'p1', 'SEG', MONDAY, 's1')!;
  const swapped = swapExercise(s0, data, 0, 'Supino com Halteres');
  expect(swapped.exercises[0]).toMatchObject({ slotId: 'a', name: 'Supino com Halteres', key: 'supino com halteres', swappedFrom: 'Supino Reto' });
  expect(swapped.exercises[0]!.sets).toEqual(Array(3).fill({ reps: 10, weight: 18, kind: 'work', done: false }));
  expect(swapExercise(s0, data, 0, 'Bike').exercises[0]).toMatchObject({ mode: 'cardio', sets: [], cardio: { minutes: 20, km: 0, done: false } });
  const back = swapExercise(swapped, data, 0, 'Supino Reto');
  expect(back.exercises[0]).toMatchObject({ name: 'Supino Reto', key: 'supino reto' });
  expect(back.exercises[0]!.swappedFrom).toBeUndefined();
  expect(swapExercise(s0, data, 0, 'Inventado')).toBe(s0);
});
