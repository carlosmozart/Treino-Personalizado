import { expect, test } from 'vitest';
import { achievementList, startWeightGoal, unlockAchievements } from './achievements';
import { sampleData, workout } from './testing';

const NOW = new Date(2026, 9, 7, 9);

test('desbloqueia o que foi atingido, uma vez só, com data', () => {
  const data = sampleData({ checkins: { '2026-05-04': { dayKey: 'SEG' } }, workouts: [workout('2026-05-04', 'Supino', [[10, 40]])] });
  const { data: next, events } = unlockAchievements(data, NOW);
  expect(events.map(e => e.kind === 'achievement' && e.name)).toEqual(['Primeiro Passo', 'Que a Força Esteja Com Você']);
  expect(next.gamification.achievements.primeiro_checkin).toBe('2026-10-07');
  expect(unlockAchievements(next, NOW).data).toBe(next);
});

test('lista com progresso limitado ao alvo', () => {
  const data = sampleData();
  data.workouts = [workout('2026-10-01', 'Supino', [[10, 100], [10, 100]])];
  const vol = achievementList(data).find(a => a.id === 'volume_10k')!;
  expect(vol).toMatchObject({ current: 2000, target: 10000, unlockedAt: null });
  expect(achievementList(data)).toHaveLength(28);
});

test('meta de peso nova parte do peso atual', () => {
  const data = sampleData();
  data.profile.weighIns = [{ date: '2026-10-01', weight: 94.2 }];
  const { data: next } = startWeightGoal(data, 85, NOW);
  expect(next.profile.weightGoal).toEqual({ startWeight: 94.2, targetWeight: 85, startedAt: '2026-10-07', checkpoints: {} });
  expect(next.sync.changed.profile).toBe(NOW.toISOString());
  expect(startWeightGoal(data, 0, NOW).data).toBe(data);
});
