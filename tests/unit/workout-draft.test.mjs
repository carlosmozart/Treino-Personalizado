import { expect, test, vi, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/core/workout-draft.js', import.meta.url), 'utf8'), context);
afterEach(() => vi.useRealTimers());
function setup() {
  const state = { key: 'SEG', profile: 'p1', data: {}, saved: null, history: {}, completion: {} };
  const collapsed = new Set(), hints = new Set(['a']), notes = new Set(['a']);
  const saveJSON = vi.fn((key, value) => { state.saved = value; });
  const removeItem = vi.fn(() => { state.saved = null; });
  const api = context.window.TREINO_WORKOUT_DRAFT.create({
    getActiveWorkoutKey: () => state.key, setActiveWorkoutKey: key => { state.key = key; },
    getActiveProfileId: () => state.profile,
    getActiveProfile: () => ({ schedule: { SEG: { exercises: [{ id: 'a', name: 'Novo', targetSets: 3, targetReps: 10, targetWeight: 20 }] } } }),
    getFormData: () => state.data, setFormData: data => { state.data = data; },
    todayKey: () => '2026-09-28', markWorkoutStart: vi.fn(), saveJSON,
    loadJSON: () => state.saved, DRAFT_KEY: 'draft', isStorageAvailable: () => true,
    localStorage: { removeItem }, getDailyCompletion: () => state.completion,
    getExerciseHistory: () => state.history, getCollapsedIds: () => collapsed,
    getHintsOpen: () => hints, getNotesOpen: () => notes,
    getLastSessionForExercise: () => null, getEntrySeries: e => e.series || [],
    buildSeriesFromHistory: (ex, saved, count) => Array.from({ length: count }, () => ({
      reps: saved?.reps || ex.targetReps, weight: saved?.weight || ex.targetWeight
    })),
    setTimeout: (...args) => setTimeout(...args), clearTimeout: id => clearTimeout(id)
  });
  return { api, state, saveJSON, removeItem, collapsed, hints, notes };
}
test('agrupa alterações em 400ms e cancelamento não apaga rascunho', () => {
  vi.useFakeTimers();
  const s = setup();
  s.api.saveDraft();
  vi.advanceTimersByTime(200);
  s.api.saveDraft();
  s.state.data = { a: { weight: 35 } };
  vi.advanceTimersByTime(399);
  expect(s.saveJSON).not.toHaveBeenCalled();
  vi.advanceTimersByTime(1);
  expect(s.state.saved.formData.a.weight).toBe(35);
  s.api.saveDraft();
  s.api.cancelPendingSave();
  vi.runAllTimers();
  expect(s.saveJSON).toHaveBeenCalledTimes(1);
  expect(s.removeItem).not.toHaveBeenCalled();
});
test('gravação imediata e limpeza cancelam salvamento pendente', () => {
  vi.useFakeTimers();
  const s = setup();
  s.api.saveDraft();
  s.api.saveDraftNow();
  vi.runAllTimers();
  expect(s.saveJSON).toHaveBeenCalledTimes(1);
  s.api.saveDraft();
  s.api.clearDraft();
  vi.runAllTimers();
  expect(s.state.saved).toBeNull();
  expect(s.saveJSON).toHaveBeenCalledTimes(1);
});
test('valida dia, perfil e treino mantendo compatibilidade sem profileId', () => {
  const s = setup();
  s.api.saveDraftNow();
  expect(s.api.loadDraftFor('SEG')).toEqual({});
  expect(s.api.loadDraftFor('TER')).toBeNull();
  s.state.profile = 'p2';
  expect(s.api.loadDraftFor('SEG')).toBeNull();
  delete s.state.saved.profileId;
  expect(s.api.loadDraftFor('SEG')).toEqual({});
  s.state.saved.date = '2026-09-27';
  expect(s.api.loadDraftFor('SEG')).toBeNull();
});
test('rascunho prevalece, nome atualizado e conclusão persistida substituem dados antigos', () => {
  const s = setup();
  s.state.saved = { date: '2026-09-28', workoutKey: 'SEG',
    formData: { a: { name: 'Antigo', weight: 40, variantIndex: 2, done: false } } };
  s.state.history = { a: { weight: 25 } };
  s.state.completion = { '2026-09-28': { a: true } };
  s.api.initializeWorkoutData('SEG');
  expect(s.state.data.a).toMatchObject({ name: 'Novo', weight: 40, variantIndex: 0, done: true });
  expect([...s.collapsed]).toEqual(['a']);
  expect(s.hints.size + s.notes.size).toBe(0);
  s.state.saved.formData.a.customName = 'Troca';
  s.api.initializeWorkoutData('SEG');
  expect(s.state.data.a.name).toBe('Antigo');
});
test('sem rascunho usa histórico e depois metas do plano', () => {
  const s = setup();
  s.state.history = { a: { reps: 8, weight: 30, series: [{}, {}] } };
  s.api.initializeWorkoutData('SEG');
  expect(s.state.data.a.series).toEqual([{ reps: 8, weight: 30 }, { reps: 8, weight: 30 }]);
  s.state.history = {};
  s.api.initializeWorkoutData('SEG');
  expect(s.state.data.a.series).toHaveLength(3);
  expect(s.state.data.a.weight).toBe(20);
});
