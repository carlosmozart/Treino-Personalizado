import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/exercise-actions.js', import.meta.url), 'utf8'), context);
function setup() {
  const state = { a: { name: 'Supino', type: 'forca', series: [{ done: false }], variantIndex: 0 } };
  const ex = { id: 'a', name: 'Supino', backups: [] }, completion = {}, checkins = {}, collapsed = new Set();
  const flags = { all: false }, history = {}, timers = [];
  const record = vi.fn(() => ({ recordes: [], falhas: [] })), grant = vi.fn(), rest = vi.fn();
  const save = vi.fn(), draft = vi.fn(), picker = vi.fn(), render = vi.fn();
  const api = context.window.TREINO_EXERCISE_ACTIONS.create({
    document: { getElementById: () => ({}), querySelector: () => null },
    getFormData: () => state, getHintsOpen: () => new Set(), getNotesOpen: () => new Set(),
    getCollapsedIds: () => collapsed, getHintsSeen: () => ({}), getExerciseHistory: () => history,
    getDailyCompletion: () => completion, getGamification: () => ({ checkins: {} }),
    getCheckins: () => checkins, getActiveWorkoutKey: () => 'SEG',
    getSettings: () => ({ restAutoStart: true }),
    getActiveProfile: () => ({ schedule: { SEG: { exercises: [ex] } } }),
    renderExerciseCard: render, openSwapPicker: picker, saveJSON: save, HINTS_KEY: 'hints',
    getHistoryKey: (id, index) => id + index, saveDraftNow: draft, markWorkoutStart: vi.fn(),
    getSeries: s => s.series, setTimeout: fn => timers.push(fn), todayKey: () => '2026-09-28',
    COMPLETION_KEY: 'completion', areAllExercisesDoneForActiveWorkout: () => flags.all,
    startRestTimer: rest, getRestSecondsFor: () => 90, CHECKIN_KEY: 'checkins',
    grantCheckinXP: grant, recordWorkoutSessions: record, markWorkoutEnd: vi.fn(),
    showToast: vi.fn(), renderCheckinGrid: vi.fn(), perfilView: { classList: { contains: () => true } },
    renderWeeklyVolume: vi.fn(), renderWorkoutHistory: vi.fn(), syncLegacyFields: vi.fn(), saveDraft: draft
  });
  return { api, state, ex, completion, checkins, collapsed, flags, history, timers, record, grant, rest, draft, picker };
}
test('concluir persiste séries; reabrir antes da animação não recolhe cartão', () => {
  const s = setup();
  s.api.toggleDone('a');
  expect(s.state.a.series[0].done).toBe(true);
  expect(s.completion['2026-09-28'].a).toBe(true);
  expect(s.rest).not.toHaveBeenCalled();
  s.api.toggleDone('a');
  s.timers.forEach(fn => fn());
  expect(s.collapsed.has('a')).toBe(false);
  expect(s.completion['2026-09-28'].a).toBeUndefined();
  expect(s.state.a.series[0].done).toBe(false);
});
test('conclusão pelas séries preserva marcações e treino completo registra histórico e XP', () => {
  const s = setup();
  s.flags.all = true;
  s.api.toggleDone('a', true);
  expect(s.state.a.series[0].done).toBe(false);
  expect(s.checkins['2026-09-28']).toBe('SEG');
  expect(s.grant).toHaveBeenCalledWith('2026-09-28', true);
  expect(s.record).toHaveBeenCalledWith({ apenasConcluidos: true });
});
test('troca sem reserva abre biblioteca; reserva usa histórico e persiste imediatamente', () => {
  const s = setup();
  s.api.swapExercise('a');
  expect(s.picker).toHaveBeenCalledWith('a');
  s.ex.backups = [{ name: 'Corrida', type: 'cardio' }];
  s.history.a1 = { type: 'cardio', duration: 35, distance: 4 };
  s.api.swapExercise('a');
  expect(s.state.a).toMatchObject({ name: 'Corrida', type: 'cardio', duration: 35, distance: 4, variantIndex: 1 });
  expect(s.draft).toHaveBeenCalledTimes(1);
});
test('cardio inicia descanso quando restam exercícios e ajustes não ficam negativos', () => {
  const s = setup();
  s.state.a.type = 'cardio';
  s.state.a.distance = 0.3;
  s.api.adjustValue('a', 'distance', -0.5);
  expect(s.state.a.distance).toBe(0);
  s.api.updateObs('a', 'nota');
  expect(s.state.a.obs).toBe('nota');
  s.api.toggleDone('a');
  expect(s.rest).toHaveBeenCalledWith(90, 'Supino');
});
