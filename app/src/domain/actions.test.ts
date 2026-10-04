import { expect, test } from 'vitest';
import { addWater, dailyCheck, deleteWorkout, finishWorkout, logWeight, toggleCheckin, updateSettings } from './actions';
import { completeExercise, startSession, toggleSet } from './session';
import { sampleData, workout } from './testing';
import { addDays } from './dates';

const MONDAY = new Date(2026, 9, 5, 10, 0);
const later = (d: Date, minutes: number) => new Date(d.getTime() + minutes * 60000);

test('finalizar sem nada marcado não grava nada', () => {
  const data = sampleData();
  const s = startSession(data, 'p1', 'SEG', MONDAY, 's1')!;
  expect(finishWorkout(data, s, later(MONDAY, 40))).toEqual({ kind: 'empty' });
});

test('treino completo vale XP cheio, sobe de nível e não altera os dados originais', () => {
  const data = sampleData();
  const before = structuredClone(data);
  const s = completeExercise(completeExercise(startSession(data, 'p1', 'SEG', MONDAY, 's1')!, 0), 1);
  const r = finishWorkout(data, s, later(MONDAY, 45));
  if (r.kind !== 'saved') throw new Error('esperava salvar');
  expect(data).toEqual(before);
  expect(r.full).toBe(true);
  expect(r.data.workouts).toEqual([r.workout]);
  expect(r.data.checkins['2026-10-05']).toEqual({ dayKey: 'SEG' });
  // plano de 6 dias: 600 / 6 = 100 XP; nível 1 pede 100
  expect(r.data.gamification.totalXP).toBe(100);
  expect(r.events).toEqual([{ kind: 'xp', amount: 100, reason: 'checkin-full' }, { kind: 'level-up', level: 2 }]);
});

test('treino parcial vale meio XP; um segundo treino completo no dia completa a diferença', () => {
  const data = sampleData();
  const partial = toggleSet(startSession(data, 'p1', 'SEG', MONDAY, 's1')!, 0, 0);
  const r1 = finishWorkout(data, partial, later(MONDAY, 20));
  if (r1.kind !== 'saved') throw new Error();
  expect(r1.data.gamification.checkinXP['2026-10-05']).toEqual({ amount: 50, full: false });
  const full = completeExercise(completeExercise(startSession(r1.data, 'p1', 'SEG', later(MONDAY, 60), 's2')!, 0), 1);
  const r2 = finishWorkout(r1.data, full, later(MONDAY, 100));
  if (r2.kind !== 'saved') throw new Error();
  expect(r2.data.workouts.map(w => w.id)).toEqual(['s1', 's2']);
  expect(r2.data.gamification.totalXP).toBe(100);
  expect(r2.events[0]).toEqual({ kind: 'xp', amount: 50, reason: 'checkin-upgrade' });
});

test('aponta recorde quando a melhor série supera as sessões anteriores', () => {
  const data = sampleData({ workouts: [workout('2026-10-01', 'Supino Reto', [[10, 20]])] });
  let s = startSession(data, 'p1', 'SEG', MONDAY, 's1')!;
  s = { ...s, exercises: s.exercises.map((ex, i) => (i === 0 ? { ...ex, sets: ex.sets.map(set => ({ ...set, weight: 25, done: true })) } : ex)) };
  const r = finishWorkout(data, s, later(MONDAY, 30));
  if (r.kind !== 'saved') throw new Error();
  expect(r.events).toContainEqual({ kind: 'record', name: 'Supino Reto', reps: 10, weight: 25 });
  expect(r.events.filter(e => e.kind === 'record')).toHaveLength(1);
});

test('sequência de um ciclo do plano dá bônus, e 80% da semana libera a refeição livre — uma vez', () => {
  const saturday = new Date(2026, 9, 10, 9, 0);
  const data = sampleData();
  for (let i = 0; i < 5; i++) data.checkins[addDays('2026-10-05', i)] = { dayKey: null };
  const s = completeExercise(completeExercise(startSession(data, 'p1', 'SAB', saturday, 's1')!, 0), 1);
  const r = finishWorkout(data, s, later(saturday, 40));
  if (r.kind !== 'saved') throw new Error();
  expect(r.events).toContainEqual({ kind: 'streak-bonus', streak: 6, xp: 30 });
  expect(r.events).toContainEqual({ kind: 'free-meal' });
  expect(r.data.gamification.longestStreak).toBe(6);
  const again = finishWorkout(r.data, { ...s, id: 's2' }, later(saturday, 90));
  if (again.kind !== 'saved') throw new Error();
  expect(again.events.some(e => e.kind === 'streak-bonus' || e.kind === 'free-meal')).toBe(false);
});

test('check-in manual vale meio XP e desfazer devolve', () => {
  const data = sampleData();
  const on = toggleCheckin(data, 'SEG', MONDAY);
  expect(on.data.checkins['2026-10-05']).toEqual({ dayKey: 'SEG' });
  expect(on.data.gamification.totalXP).toBe(50);
  const off = toggleCheckin(on.data, 'SEG', MONDAY);
  expect(off.data.checkins['2026-10-05']).toBeUndefined();
  expect(off.data.gamification.totalXP).toBe(0);
  expect(off.events).toEqual([{ kind: 'xp-removed', amount: 50 }]);
});

test('água: meta do dia dá bônus uma vez; nunca negativa', () => {
  const data = sampleData(); // 80 kg, moderado → 3150 ml
  const r1 = addWater(data, 3000, MONDAY);
  expect(r1.events).toEqual([]);
  const r2 = addWater(r1.data, 250, MONDAY);
  expect(r2.events).toEqual([{ kind: 'xp', amount: 10, reason: 'water' }, { kind: 'water-goal', xp: 10 }]);
  expect(addWater(r2.data, 250, MONDAY).events).toEqual([]);
  expect(addWater(data, -100, MONDAY).data).toBe(data);
  expect(addWater(r1.data, -5000, MONDAY).data.water['2026-10-05']).toBeUndefined();
});

test('pesagem: uma por dia, peso atual é a mais recente e marcos da meta são registrados', () => {
  let data = sampleData();
  data.profile.weightGoal = { startWeight: 90, targetWeight: 80, startedAt: '2026-09-01' };
  data = logWeight(data, 85, '2026-10-01').data;
  data = logWeight(data, 84.96, '2026-10-01').data;
  data = logWeight(data, 88, '2026-09-20').data;
  expect(data.profile.weighIns).toEqual([{ date: '2026-09-20', weight: 88 }, { date: '2026-10-01', weight: 85 }]);
  expect(data.profile.weightKg).toBe(85);
  expect(data.profile.weightGoal?.checkpoints).toEqual({ 25: '2026-10-01', 50: '2026-10-01' });
  expect(logWeight(data, 5, '2026-10-02').data).toBe(data);
});

test('ajustes limitam o descanso; apagar treino mantém o check-in', () => {
  expect(updateSettings(sampleData(), { restSeconds: 3 }).data.settings.restSeconds).toBe(15);
  const data = sampleData({ workouts: [workout('2026-10-01', 'Supino Reto', [[10, 20]], 'w1')], checkins: { '2026-10-01': { dayKey: 'QUI' } } });
  const r = deleteWorkout(data, 'w1');
  expect(r.data.workouts).toEqual([]);
  expect(r.data.checkins['2026-10-01']).toBeDefined();
});

test('aniversário cumprimenta uma vez por ano', () => {
  const data = sampleData();
  data.profile = { ...data.profile, name: 'Ana', birthdate: '1990-10-05' };
  const r = dailyCheck(data, MONDAY);
  expect(r.events).toEqual([{ kind: 'birthday', name: 'Ana' }]);
  expect(dailyCheck(r.data, MONDAY).data).toBe(r.data);
  expect(dailyCheck(sampleData(), MONDAY).events).toEqual([]);
});
