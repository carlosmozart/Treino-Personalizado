import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {}, Date });
vm.runInContext(await readFile(new URL('../../js/core/session-history.js', import.meta.url), 'utf8'), context);
function setup() {
  const state = { log: {}, legacy: {} }, save = vi.fn();
  const api = context.window.TREINO_SESSION_HISTORY.create({
    getSessionLog: () => state.log, getExerciseHistory: () => state.legacy, saveSessionLog: save,
    normalizeExerciseName: s => s.trim().toLowerCase(),
    formatLocalDateKey: d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-')
  });
  return { state, save, api };
}
test('registro ordena, remove entradas sem data e atualiza mesmo dia', () => {
  const s = setup();
  s.state.log = { a: [{ date: '2026-09-29' }, {}] };
  s.api.recordSession('a', { date: '2026-09-28', weight: 20 });
  s.api.recordSession('a', { date: '2026-09-28', weight: 30 });
  expect(s.state.log.a).toEqual([{ date: '2026-09-28', weight: 30 }, { date: '2026-09-29' }]);
  expect(s.api.entryDateKey({ date: new Date(2026, 8, 28) })).toBe('2026-09-28');
  expect(s.api.entryDateKey({ date: 123 })).toBe('');
});
test('mantém somente as 200 sessões mais recentes', () => {
  const s = setup();
  for (let i = 0; i < 202; i++) s.api.recordSession('a', { date: String(i).padStart(4, '0') });
  expect(s.state.log.a).toHaveLength(200);
  expect(s.state.log.a[0].date).toBe('0002');
});
test('recorde compara carga e desempata por repetições excluindo sessão do mesmo dia', () => {
  const s = setup();
  s.state.log.a = [{ date: '2026-09-27', sets: 3, reps: 10, weight: 40 }];
  expect(s.api.checkPersonalRecord('a', { date: '2026-09-28', series: [{ reps: 11, weight: 40 }] })).toBe(true);
  expect(s.api.checkPersonalRecord('a', { date: '2026-09-28', series: [{ reps: 9, weight: 40 }] })).toBe(false);
  expect(s.api.checkPersonalRecord('a', { date: '2026-09-27', series: [{ reps: 11, weight: 50 }] })).toBe(false);
  expect(s.api.sessionVolume({ sets: 3, reps: 10, weight: 40 })).toBe(1200);
});
test('migração copia registros válidos uma única vez sem sobrescrever log existente', () => {
  const s = setup();
  s.state.legacy = { a: { date: '2026-09-28', sets: 2 }, b: {} };
  s.api.migrateHistoryToSessionLog();
  expect(s.state.log).toEqual({ a: [{ date: '2026-09-28', sets: 2 }] });
  expect(s.state.log.a[0]).not.toBe(s.state.legacy.a);
  s.api.migrateHistoryToSessionLog();
  expect(s.save).toHaveBeenCalledTimes(1);
});
