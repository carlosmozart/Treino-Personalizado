import { expect, test } from 'vitest';
import { addWater, deleteWorkout, finishWorkout, logWeight, removeWeighIn, toggleCheckin, updateSettings } from './actions';
import { computeTotalXP, type AppData } from './model';
import { completeExercise, startSession, toggleSet } from './session';
import { mergeAppData, normalizeAppData, stampAll } from './sync';
import { sampleData } from './testing';

const at = (day: number, hour = 10) => new Date(2026, 9, day, hour, 0);
const base = () => stampAll(sampleData(), at(1));

function train(data: AppData, day: number, id: string, full = true): AppData {
  let s = startSession(data, 'p1', 'SEG', at(day), id)!;
  s = full ? completeExercise(completeExercise(s, 0), 1) : toggleSet(s, 0, 0);
  const r = finishWorkout(data, s, at(day, 11));
  if (r.kind !== 'saved') throw new Error('treino vazio');
  return r.data;
}

test('treinos feitos em dois aparelhos se juntam, e o XP vem dos registros', () => {
  const phone = train(base(), 5, 'celular');
  const tablet = train(base(), 6, 'tablet');
  const merged = mergeAppData(phone, tablet);
  expect(merged.workouts.map(w => w.id)).toEqual(['celular', 'tablet']);
  expect(Object.keys(merged.checkins).sort()).toEqual(['2026-10-05', '2026-10-06']);
  expect(merged.gamification.totalXP).toBe(200);
  expect(merged.gamification.totalXP).toBe(computeTotalXP(merged.gamification));
});

test('mesmo dia nos dois aparelhos: XP não é contado em dobro e vale o check-in cheio', () => {
  const half = train(base(), 5, 'a', false);
  const full = train(base(), 5, 'b', true);
  const merged = mergeAppData(half, full);
  expect(merged.workouts).toHaveLength(2);
  expect(merged.gamification.checkinXP['2026-10-05']).toEqual({ amount: 100, full: true });
  expect(merged.gamification.totalXP).toBe(100);
});

test('exclusão mais recente vence; alteração mais recente que a exclusão traz o registro de volta', () => {
  const original = train(base(), 5, 'w1');
  const deleted = deleteWorkout(original, 'w1', at(7)).data;
  expect(mergeAppData(original, deleted).workouts).toEqual([]);
  expect(mergeAppData(deleted, original).workouts).toEqual([]);

  const weighed = logWeight(base(), 82, '2026-10-05', at(5)).data;
  const removed = removeWeighIn(weighed, '2026-10-05', at(6)).data;
  const weighedAgain = logWeight(weighed, 81, '2026-10-05', at(8)).data;
  const merged = mergeAppData(removed, weighedAgain);
  expect(merged.profile.weighIns).toEqual([{ date: '2026-10-05', weight: 81 }]);
  expect(merged.profile.weightKg).toBe(81);
});

test('check-in desfeito num aparelho some depois da junção, com o XP dele', () => {
  const on = toggleCheckin(base(), 'SEG', at(5, 9)).data;
  const off = toggleCheckin(on, 'SEG', at(5, 12)).data;
  const merged = mergeAppData(on, off);
  expect(merged.checkins['2026-10-05']).toBeUndefined();
  expect(merged.gamification.checkinXP['2026-10-05']).toBeUndefined();
  expect(merged.gamification.totalXP).toBe(0);
});

test('ajustes e água: vence a alteração mais recente; bônus conquistados ficam', () => {
  const a = updateSettings(base(), { restSeconds: 60 }, at(5)).data;
  const b = addWater(updateSettings(base(), { restSeconds: 120 }, at(6)).data, 3200, at(6)).data;
  const merged = mergeAppData(a, b);
  expect(merged.settings.restSeconds).toBe(120);
  expect(merged.water['2026-10-06']).toBe(3200);
  expect(merged.gamification.waterBonus['2026-10-06']).toBe(10);
  expect(merged.gamification.totalXP).toBe(10);
});

test('juntar de novo não muda nada', () => {
  const a = train(addWater(base(), 500, at(4)).data, 5, 'a');
  const b = deleteWorkout(train(base(), 6, 'b'), 'b', at(7)).data;
  const once = mergeAppData(a, b);
  expect(mergeAppData(once, b)).toEqual(once);
  expect(mergeAppData(once, a)).toEqual(once);
  expect(mergeAppData(once, once)).toEqual(once);
});

test('dados anteriores aos carimbos são completados sem perder XP', () => {
  const old = sampleData();
  old.gamification = { ...old.gamification, totalXP: 330, checkinXP: { '2026-10-01': { amount: 100, full: true } } };
  (old.gamification as unknown as { waterBonus: Record<string, boolean> }).waterBonus = { '2026-10-01': true };
  delete (old.gamification as Partial<AppData['gamification']>).baseXP;
  delete (old as Partial<AppData>).sync;
  const fixed = normalizeAppData(old, at(2));
  expect(fixed.gamification).toMatchObject({ totalXP: 330, baseXP: 230, waterBonus: { '2026-10-01': 0 } });
  expect(fixed.sync.changed).toMatchObject({ 'plan:p1': at(2).toISOString(), profile: at(2).toISOString() });
});
