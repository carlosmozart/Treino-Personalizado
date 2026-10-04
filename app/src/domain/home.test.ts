import { expect, test } from 'vitest';
import { progressCard, todayCard, waterCard, weekStrip, weightCard } from './home';
import { sampleData } from './testing';

const WED = new Date(2026, 9, 7, 9);
const SUN = new Date(2026, 9, 11, 9);

test('semana de segunda a domingo com hoje, treinados e dias planejados', () => {
  const data = sampleData({ checkins: { '2026-10-05': { dayKey: 'SEG' }, '2026-10-07': { dayKey: 'QUA' } } });
  const week = weekStrip(data, WED);
  expect(week.map(d => d.letter).join('')).toBe('STQQSSD');
  expect(week.map(d => d.dayOfMonth)).toEqual([5, 6, 7, 8, 9, 10, 11]);
  expect(week.filter(d => d.trained).map(d => d.date)).toEqual(['2026-10-05', '2026-10-07']);
  expect(week.find(d => d.today)?.date).toBe('2026-10-07');
  expect(week.filter(d => d.future)).toHaveLength(4);
  expect(week.find(d => d.dayKey === 'DOM')?.planned).toBe(false);
});

test('cartão de hoje: treino do dia, treino em andamento, descanso com o próximo e sem plano', () => {
  const data = sampleData();
  expect(todayCard(data, WED, null)).toMatchObject({ kind: 'workout', dayKey: 'QUA', title: 'Treino QUA', exercises: 2, doneToday: false });
  expect(todayCard(data, SUN, null)).toEqual({ kind: 'rest', next: { dayKey: 'SEG', title: 'Treino SEG', inDays: 1 } });
  const session = { dayName: 'Treino QUA', exercises: [{ sets: [{ done: true }, { done: false }] }] };
  expect(todayCard(data, WED, session)).toEqual({ kind: 'in-progress', title: 'Treino QUA', setsDone: 1, setsTotal: 2 });
  expect(todayCard({ ...data, activePlanId: null }, WED, null)).toEqual({ kind: 'no-plan' });
});

test('sequência, semana e refeição livre', () => {
  const data = sampleData({ checkins: { '2026-10-05': { dayKey: 'SEG' }, '2026-10-06': { dayKey: 'TER' }, '2026-10-07': { dayKey: 'QUA' } } });
  const card = progressCard(data, WED);
  expect(card).toMatchObject({ streak: 3, weekDone: 3, weekTarget: 6, freeMealMissing: 2, freeMealUnlocked: false, totalWorkouts: 0 });
  expect(card.level.level).toBe(1);
});

test('peso: variação, meta, quanto falta e direção da meta', () => {
  const data = sampleData();
  data.profile.weighIns = [{ date: '2026-09-20', weight: 88 }, { date: '2026-10-01', weight: 86.5 }];
  data.profile.weightKg = 86.5;
  data.profile.weightGoal = { startWeight: 90, targetWeight: 80, startedAt: '2026-09-01' };
  expect(weightCard(data)).toMatchObject({ current: 86.5, delta: -1.5, target: 80, remaining: 6.5, goalPercent: 35, towardGoal: true });
  data.profile.weightGoal = { startWeight: 70, targetWeight: 95, startedAt: '2026-09-01' };
  expect(weightCard(data)?.towardGoal).toBe(false);
  expect(weightCard({ ...data, profile: { ...data.profile, weighIns: [], weightKg: null } })).toBeNull();
});

test('água do dia em relação à meta', () => {
  const data = sampleData({ water: { '2026-10-07': 1575 } }); // 80 kg moderado → 3150 ml
  expect(waterCard(data, WED)).toEqual({ ml: 1575, target: 3150, percent: 50 });
});
