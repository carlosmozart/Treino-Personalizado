import { expect, test } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/core/backup-validation.js', import.meta.url), 'utf8'), context);
const validator = context.window.TREINO_BACKUP_VALIDATION;
const valid = (key, value) => validator.isValidData({ [key]: JSON.stringify(value) }, [key], new Set([key]));

test.each([
  ['treino_user_profile', { weightHistory: {} }],
  ['treino_user_profile', { weightHistory: [null] }],
  ['treino_session_log', { supino: [{ series: [null] }] }],
  ['treino_exercise_history', { supino: { weight: {} } }],
  ['treino_gamification', { checkins: null }],
  ['treino_gamification', { totalXP: '100' }],
  ['treino_settings', { restSound: 'false' }],
  ['treino_daily_completion', { hoje: [] }],
  ['treino_workout_draft', { formData: { supino: null } }],
  ['treino_profiles', { plano: { schedule: {} } }],
  ['treino_water_log', { hoje: 'abc' }]
])('recusa estrutura interna inválida: %s %j', (key, value) => {
  expect(valid(key, value)).toBe(false);
});

test('aceita números de formulários e histórico legado sem séries', () => {
  expect(valid('treino_user_profile', { weightGoal: { startWeight: 90, targetWeight: 80, startedAt: '2026-09-27' } })).toBe(true);
  expect(valid('treino_user_profile', { weightGoal: { startWeight: -90, targetWeight: 80, startedAt: '2026-09-27' } })).toBe(false);
  expect(valid('treino_user_profile', { height: '175', weight: '', weightHistory: [] })).toBe(true);
  expect(valid('treino_session_log', { supino: [{ sets: '3', reps: '10', weight: '40' }] })).toBe(true);
  expect(valid('treino_checkins', { ontem: true, hoje: 'DOM' })).toBe(true);
});

test('valida todos os dias e exercícios do plano', () => {
  const schedule = Object.fromEntries(['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'].map(day =>
    [day, { name: day, focus: '', exercises: [{ id: 'supino', name: 'Supino', sets: '3' }] }]));
  expect(valid('treino_profiles', { plano: { name: 'Plano', schedule } })).toBe(true);
  schedule.DOM.exercises[0].backups = [null];
  expect(valid('treino_profiles', { plano: { name: 'Plano', schedule } })).toBe(false);
});

test('recusa propriedades perigosas e metadados malformados', () => {
  expect(valid('treino_user_profile', JSON.parse('{"extra":{"__proto__":{}}}'))).toBe(false);
  const envelope = { app: 'treino-personalizado', backupVersion: 1 };
  expect(validator.isValidEnvelope(envelope)).toBe(true);
  expect(validator.isValidEnvelope({ ...envelope, exportedAt: {} })).toBe(false);
  expect(validator.isValidEnvelope({ ...envelope, appVersion: [] })).toBe(false);
});
