import { expect, test, vi } from 'vitest';
import { autoBackupName, startAutoBackup, worthAutoBackup } from './auto-backup';
import { sampleData, workout } from '../domain/testing';
import type { AppData } from '../domain/model';

test('só treino novo ou pesagem nova disparam, e respeita o desligado', () => {
  const a = sampleData();
  const b = { ...a, workouts: [workout('2026-10-07', 'Supino', [[10, 40]])] };
  expect(worthAutoBackup(a, b)).toBe(true);
  expect(worthAutoBackup(a, { ...a, water: { '2026-10-07': 250 } })).toBe(false);
  expect(worthAutoBackup(a, { ...a, profile: { ...a.profile, weighIns: [{ date: '2026-10-07', weight: 90 }] } })).toBe(true);
  expect(worthAutoBackup(a, { ...b, settings: { ...b.settings, autoBackup: false } })).toBe(false);
  expect(worthAutoBackup(null, b)).toBe(false);
  expect(autoBackupName(new Date(2026, 9, 7))).toBe('treino-auto-2026-10-07.json');
});

test('grava uma vez depois da espera, com os dados mais recentes', async () => {
  vi.useFakeTimers();
  let listener: (n: AppData | null, p: AppData | null) => void = () => undefined;
  const save = vi.fn(() => Promise.resolve());
  startAutoBackup({ subscribe: l => { listener = l; }, save, onError: () => undefined, appVersion: 't', delayMs: 100 });
  const a = sampleData();
  const b = { ...a, workouts: [workout('2026-10-07', 'Supino', [[10, 40]])] };
  const c = { ...b, workouts: [...b.workouts, workout('2026-10-07', 'Remada', [[10, 40]])] };
  listener(b, a);
  listener(c, b);
  vi.advanceTimersByTime(150);
  expect(save).toHaveBeenCalledTimes(1);
  expect(JSON.parse((save.mock.calls[0] as unknown as [string, string])[1]).data.workouts).toHaveLength(2);
  vi.useRealTimers();
});
