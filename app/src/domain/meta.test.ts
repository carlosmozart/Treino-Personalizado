import { expect, test } from 'vitest';
import { backupReminderDue, updateMeta } from './actions';
import { notesToShow } from '../data/release-notes';
import { sampleData, workout } from './testing';

const NOW = new Date('2026-10-20T12:00:00Z');

test('lembrete de backup: só com treinos, sem automático e após 14 dias', () => {
  const d = sampleData({ workouts: [workout('2026-10-01', 'Supino', [[10, 40]])] });
  expect(backupReminderDue(d, NOW, false)).toBe(true);
  expect(backupReminderDue(d, NOW, true)).toBe(false);
  expect(backupReminderDue(updateMeta(d, { lastBackupAt: '2026-10-10T00:00:00Z' }).data, NOW, false)).toBe(false);
  expect(backupReminderDue(updateMeta(d, { hintsSeen: { backupReminderOff: true } }).data, NOW, false)).toBe(false);
  expect(backupReminderDue(sampleData(), NOW, false)).toBe(false);
});

test('novidades uma vez por versão (3.0.0-dev = 3.0)', () => {
  expect(notesToShow('2.21.2', '3.0.0')?.version).toBe('3.0.0');
  expect(notesToShow(undefined, '3.0.0-dev')?.version).toBe('3.0.0');
  expect(notesToShow('3.0.0-dev', '3.0.1')).toBeNull();
});
