import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
for (const path of ['core/series-utils', 'ui/series-actions']) {
  vm.runInContext(await readFile(new URL('../../js/' + path + '.js', import.meta.url), 'utf8'), context);
}
function setup() {
  const core = context.window.TREINO_SERIES.create({ getEntrySeries: e => e.series });
  const state = { type: 'forca', name: 'Supino', sets: 2, series: [
    { reps: 10, weight: 20 }, { reps: 8, weight: 25 }
  ] };
  const game = {}, startRestTimer = vi.fn(), saveDraft = vi.fn(), saveDraftNow = vi.fn();
  const checkAchievements = vi.fn(), askConfirm = vi.fn(async () => false);
  const toggleDone = vi.fn(() => { state.done = !state.done; });
  const api = context.window.TREINO_SERIES_ACTIONS.create({
    getFormData: () => ({ a: state }), getGamification: () => game,
    getSettings: () => ({ restAutoStart: true }), workoutSeries: core, getSeries: core.getSeries,
    getHistoryKey: id => id, collectSessionsForExercise: () => ({ sessions: [{ series: [{ weight: 60 }] }] }),
    getEntrySeries: e => e.series, getExerciseDef: () => ({ id: 'a' }),
    saveDraft, saveDraftNow, askConfirm, escapeHtml: String, renderExerciseCard: vi.fn(),
    markWorkoutStart: vi.fn(), toggleDone, startRestTimer, getRestSecondsFor: () => 90,
    saveJSON: vi.fn(), GAMIFICATION_KEY: 'game', checkAchievements
  });
  return { api, state, game, startRestTimer, saveDraft, toggleDone, askConfirm, checkAchievements };
}
test('editar e ajustar séries normaliza valores e sincroniza campos antigos', () => {
  const s = setup();
  s.api.updateSeriesField('a', 0, 'weight', '22.26');
  expect(s.state.weight).toBe(22.3);
  s.api.adjustSeries('a', 0, 'reps', -30);
  expect(s.state.reps).toBe(0);
  s.api.updateSeriesField('a', 10, 'weight', 80);
  expect(s.saveDraft).toHaveBeenCalledTimes(2);
});
test('descanso ocorre entre séries; última conclui e desmarcar reabre', () => {
  const s = setup();
  s.api.toggleSerie('a', 0);
  expect(s.startRestTimer).toHaveBeenCalledWith(90, 'Supino · série 1');
  s.api.toggleSerie('a', 1);
  expect(s.state.done).toBe(true);
  expect(s.startRestTimer).toHaveBeenCalledTimes(1);
  s.api.toggleSerie('a', 0);
  expect(s.state.done).toBe(false);
  expect(s.toggleDone).toHaveBeenCalledTimes(2);
  expect(s.startRestTimer).toHaveBeenCalledTimes(1);
});
test('carga coletiva não fica negativa e conquista de salto dispara uma vez', () => {
  const s = setup();
  s.api.applyWeightToAll('a', 10);
  s.api.applyWeightToAll('a', 10);
  expect(s.checkAchievements).toHaveBeenCalledTimes(1);
  expect(s.game.bigWeightJump).toBe(true);
  s.api.applyWeightToAll('a', -100);
  expect(s.state.series.map(sr => sr.weight)).toEqual([0, 0]);
});
test('carga suspeita mantém limiar e cancelamento recupera referência vizinha', async () => {
  const s = setup();
  expect(s.api.isSuspiciousWeight('a', s.state, 150)).toBeNull();
  expect(s.api.isSuspiciousWeight('a', s.state, 600)).toEqual({ max: 60, sugestao: 60 });
  s.api.updateSeriesField('a', 0, 'weight', 600);
  await s.api.confirmSuspiciousWeight('a', 0, 600);
  expect(s.state.weight).toBe(25);
  expect(s.askConfirm).toHaveBeenCalledTimes(1);
});
test('fileira mantém rótulos acessíveis, conclusão e omite cardio', () => {
  const s = setup();
  s.state.series[0].done = true;
  const html = s.api.renderSeriesRow({ id: 'a' }, s.state);
  expect(html).toContain('aria-label="Carga da série 1"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('1/2');
  s.state.type = 'cardio';
  expect(s.api.renderSeriesRow({ id: 'a' }, s.state)).toBe('');
});
