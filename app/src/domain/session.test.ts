import { describe, expect, it, test } from 'vitest';
import type { Workout } from './model';
import {
  addSet, completeExercise, duplicateSet, toggleFailure, insertSet, removeSet, repeatSession, sessionProgress, sessionToWorkout, startSession, swapExercise,
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
  // fora das reservas também vale (troca pela biblioteca); o mesmo nome não muda nada
  expect(swapExercise(s0, data, 0, 'Inventado').exercises[0]!.name).toBe('Inventado');
  expect(swapExercise(s0, data, 0, s0.exercises[0]!.name)).toBe(s0);
});

describe('repetir hoje (R4)', () => {
  const now = new Date(2026, 9, 7, 10);

  it('mesmos exercícios e números, nada marcado, data de hoje', () => {
    const d = sampleData();
    const w = workout('2026-10-01', 'Supino Reto', [[10, 40], [8, 42.5]]);
    w.entries[0]!.key = 'supino reto';
    w.entries[0]!.sets.unshift({ reps: 10, weight: 20, kind: 'warmup' });
    w.dayName = 'Treino A';
    const s = repeatSession(d, w, now, 's1')!;
    expect(s.date).toBe('2026-10-07');
    expect(s.dayName).toBe('Treino A');
    expect(s.exercises[0]!.sets).toEqual([
      { reps: 10, weight: 20, kind: 'warmup', done: false },
      { reps: 10, weight: 40, kind: 'work', done: false },
      { reps: 8, weight: 42.5, kind: 'work', done: false }
    ]);
    // o exercício está no plano: liga ao exercício de lá (troca por reserva volta a funcionar)
    expect(s.exercises[0]!.slotId).toBe('e1');
  });

  it('cardio mantém minutos e km', () => {
    const w: Workout = { id: 'w1', date: '2026-10-01', source: 'app', entries: [{ key: 'esteira', name: 'Esteira', mode: 'cardio', sets: [], cardio: { minutes: 25, km: 3 } }] };
    expect(repeatSession(sampleData(), w, now, 's1')!.exercises[0]!.cardio).toEqual({ minutes: 25, km: 3, done: false });
  });

  it('treino sem exercícios não começa', () => {
    expect(repeatSession(sampleData(), { id: 'w', date: '2026-10-01', source: 'app', entries: [] }, now, 's1')).toBeNull();
  });
});

describe('deslizar a série (R2)', () => {
  const now = new Date(2026, 9, 7, 10);
  const start = () => {
    const d = sampleData({ workouts: [] });
    const s = startSession(d, 'p1', 'QUA', now, 's1')!;
    return updateSet(toggleSet(s, 0, 0), 0, 0, { weight: 50 });
  };

  it('copiar põe a série logo abaixo, ainda não feita', () => {
    const s = duplicateSet(start(), 0, 0);
    expect(s.exercises[0]!.sets).toHaveLength(4);
    expect(s.exercises[0]!.sets[1]).toMatchObject({ weight: 50, done: false });
    expect(s.exercises[0]!.sets[0]).toMatchObject({ weight: 50, done: true });
  });

  it('apagar e desfazer volta a série ao mesmo lugar, como estava', () => {
    const before = start();
    const removed = before.exercises[0]!.sets[0]!;
    const after = insertSet(removeSet(before, 0, 0), 0, 0, removed);
    expect(after.exercises[0]!.sets).toEqual(before.exercises[0]!.sets);
  });

  it('a última série fica', () => {
    let s = start();
    s = removeSet(removeSet(s, 0, 0), 0, 0);
    expect(removeSet(s, 0, 0).exercises[0]!.sets).toHaveLength(1);
  });
});

describe('até a falha (S5)', () => {
  it('marca, vai para o histórico e a cópia não herda', () => {
    const d = sampleData({ workouts: [] });
    let s = startSession(d, 'p1', 'QUA', new Date(2026, 9, 7, 10), 's1')!;
    s = toggleSet(toggleFailure(s, 0, 0), 0, 0);
    expect(s.exercises[0]!.sets[0]!.failure).toBe(true);
    expect(duplicateSet(s, 0, 0).exercises[0]!.sets[1]!.failure).toBeUndefined();
    const w = sessionToWorkout(s, new Date(2026, 9, 7, 11));
    expect(w?.entries[0]!.sets[0]).toMatchObject({ failure: true });
    expect(toggleFailure(s, 0, 0).exercises[0]!.sets[0]!.failure).toBeUndefined();
  });
});
