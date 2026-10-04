import { expect, test, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const errors = vi.fn();
const context = vm.createContext({ window: {}, console: { error: errors } });
vm.runInContext(await readFile(new URL('../../js/ui/workout-recording.js', import.meta.url), 'utf8'), context);

function setup(series = [{ reps: 10, weight: 20 }, { reps: 8, weight: 25 }]) {
  const state = {
    data: { a: { name: 'Supino', type: 'forca', done: true, obs: ' nota ' },
      b: { name: 'Corrida', type: 'cardio', done: false, duration: 20, distance: 3 } },
    completion: {}, history: {}, checkins: {}, full: false
  };
  const recordSession = vi.fn(), checkPersonalRecord = vi.fn(() => true);
  const saveJSON = vi.fn(), saveExerciseHistory = vi.fn(), saveSessionLog = vi.fn();
  const grantCheckinXP = vi.fn(), clearDraft = vi.fn(), showToast = vi.fn();
  const reportOutput = {}, reportContainer = { classList: { remove: vi.fn() }, scrollIntoView: vi.fn() };
  const ui = context.window.TREINO_WORKOUT_RECORDING.create({
    getActiveProfile: () => ({ schedule: { seg: { name: 'Treino A', focus: 'Peito',
      exercises: [{ id: 'a', name: 'Supino' }, { id: 'b', name: 'Corrida' }] } } }),
    getActiveWorkoutKey: () => 'seg', todayKey: () => '2026-09-28',
    getDailyCompletion: () => state.completion, getFormData: () => state.data,
    getHistoryKey: id => id, getSeries: () => series.map(sr => ({ ...sr })),
    sessionVolume: entry => entry.series.reduce((sum, sr) => sum + sr.reps * sr.weight, 0),
    describeEntry: () => '2 séries', checkPersonalRecord, recordSession,
    getExerciseHistory: () => state.history, saveJSON, COMPLETION_KEY: 'completion',
    saveExerciseHistory, saveSessionLog, invalidateWorkoutHistory: vi.fn(),
    areAllExercisesDoneForActiveWorkout: () => state.full, markWorkoutEnd: () => 30,
    formatDuration: () => '30min', buildWorkoutHistory: () => [{ date: '2026-09-28' }],
    estimateWorkoutCalories: () => ({ kcal: 150 }), clearDraft,
    getCheckins: () => state.checkins, CHECKIN_KEY: 'checkins', grantCheckinXP,
    getHalfCheckinXP: () => 50, showToast, renderCheckinGrid: vi.fn(), renderExercises: vi.fn(),
    perfilView: { classList: { contains: () => true } }, renderWeeklyVolume: vi.fn(),
    renderWorkoutHistory: vi.fn(), reportOutput, reportContainer
  });
  return { state, ui, recordSession, checkPersonalRecord, saveJSON, saveExerciseHistory,
    saveSessionLog, grantCheckinXP, clearDraft, showToast, reportOutput, reportContainer };
}

test('registro automático salva somente concluídos, séries individuais e campos legados', () => {
  const s = setup();
  const result = s.ui.recordWorkoutSessions({ apenasConcluidos: true });
  expect(s.recordSession).toHaveBeenCalledTimes(1);
  expect(s.state.history.a).toEqual({
    type: 'forca', name: 'Supino', series: [{ reps: 10, weight: 20 }, { reps: 8, weight: 25 }],
    sets: 2, reps: 10, weight: 20, date: '2026-09-28', obs: 'nota'
  });
  expect(result.volume).toBe(400);
  expect(result.linhas).toContain('[Nota: nota]');
  expect(s.checkPersonalRecord.mock.invocationCallOrder[0]).toBeLessThan(s.recordSession.mock.invocationCallOrder[0]);
  expect(s.saveExerciseHistory).toHaveBeenCalledTimes(1);
  expect(s.saveSessionLog).toHaveBeenCalledTimes(1);
});

test('falha isolada é informada sem impedir o registro dos demais exercícios', () => {
  const s = setup();
  s.state.data.b.done = true;
  s.recordSession.mockImplementationOnce(() => { throw new Error('simulada'); });
  const result = s.ui.recordWorkoutSessions({ marcarConcluidos: true });
  expect(result.falhas).toEqual(['Supino']);
  expect(s.state.history.a).toBeUndefined();
  expect(s.state.history.b).toMatchObject({ type: 'cardio', duration: 20, distance: 3 });
  expect(s.state.completion['2026-09-28'].b).toBe(true);
  expect(s.saveSessionLog).toHaveBeenCalledTimes(1);
});

test.each([false, true])('finalização preserva XP baseado na conclusão anterior (%s) e produz resumo', full => {
  const s = setup();
  s.state.full = full;
  // Simula substituição dos objetos ao restaurar os dados.
  const previousHistory = s.state.history;
  s.state.history = {};
  s.state.checkins = {};
  s.ui.finalizeWorkout();
  expect(previousHistory).toEqual({});
  // o cardio não foi marcado como feito: não entra no histórico nem vira concluído
  expect(Object.keys(s.state.history)).toEqual(['a']);
  expect(s.state.data.b.done).toBe(false);
  expect(s.grantCheckinXP).toHaveBeenCalledWith('2026-09-28', full);
  expect(s.state.checkins).toEqual({ '2026-09-28': 'seg' });
  expect(s.clearDraft).toHaveBeenCalledTimes(1);
  expect(s.reportOutput.value).toContain('Volume total: 400 kg');
  expect(s.reportOutput.value).toContain('Duração: 30min');
  expect(s.reportOutput.value).toContain('~150 kcal');
  expect(s.reportContainer.classList.remove).toHaveBeenCalledWith('hidden');
});

test('finalizar grava só as séries marcadas e ignora exercício sem série feita', () => {
  const s = setup([{ reps: 12, weight: 15, done: true }, { reps: 12, weight: 15 }, { reps: 12, weight: 15 }]);
  s.state.data.a.done = false;
  s.ui.finalizeWorkout();
  expect(s.state.history.a.series).toEqual([{ reps: 12, weight: 15 }]);
  expect(s.state.history.a.sets).toBe(1);
  expect(s.state.data.a.done).toBe(true);
  expect(s.state.history.b).toBeUndefined();
  expect(s.state.completion['2026-09-28']).toEqual({ a: true });
  expect(s.reportOutput.value).toContain('Volume total: 180 kg');
});

test('exercício sem nenhuma série marcada não é gravado', () => {
  const s = setup([{ reps: 10, weight: 20 }, { reps: 10, weight: 20 }]);
  s.state.data.a.done = false;
  const result = s.ui.recordWorkoutSessions({ marcarConcluidos: true });
  expect(s.recordSession).not.toHaveBeenCalled();
  expect(result.volume).toBe(0);
  expect(s.state.data.a.done).toBe(false);
});
