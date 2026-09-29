import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/plan-editor-actions.js', import.meta.url), 'utf8'), context);
function setup() {
  const editor = { id: 'p', currentDay: 'SEG', schedule: { SEG: { name: 'Segunda', exercises: [] } } };
  const profiles = { p: { createdAt: '2025-01-01' } };
  const fields = { editorName: ' Plano ', editorDaysPerWeek: '9', editorDayName: ' A ',
    editorDayFocus: ' Peito ', editorDescription: ' Descrição ', editorTrainingTime: '18:00' };
  const render = vi.fn(), save = vi.fn(), confirm = vi.fn(async () => true), close = vi.fn();
  const api = context.window.TREINO_PLAN_EDITOR_ACTIONS.create({
    document: { getElementById: id => ({ value: fields[id] }) },
    getEditorState: () => editor, getProfiles: () => profiles, getActiveProfileId: () => 'other',
    isCardioExerciseName: name => name === 'Corrida', renderExerciseEditorRows: render,
    MAX_EXERCISES_PER_DAY: 2, showToast: vi.fn(), makeId: () => 'ex',
    renderEditorDayTabs: vi.fn(), askConfirm: confirm, escapeHtml: String,
    DAY_FULL_NAMES: { SEG: 'Segunda' }, todayKey: () => '2026-09-28',
    saveJSON: save, PROFILES_KEY: 'profiles', closeProfileEditor: close,
    renderProfileList: vi.fn(), checkAchievements: vi.fn(), renderWorkoutSelectOptions: vi.fn(),
    syncTrainingReminders: vi.fn(async () => {})
  });
  return { api, editor, profiles, fields, render, save, confirm, close };
}
test('limite de exercícios e remoção confirmada preservam edição', async () => {
  const s = setup();
  s.api.addExerciseRow(); s.api.addExerciseRow(); s.api.addExerciseRow();
  expect(s.editor.schedule.SEG.exercises).toHaveLength(2);
  s.confirm.mockResolvedValueOnce(false);
  await s.api.removeExerciseRow(0);
  expect(s.editor.schedule.SEG.exercises).toHaveLength(2);
  await s.api.removeExerciseRow(0);
  expect(s.editor.schedule.SEG.exercises).toHaveLength(1);
});
test('nome ajusta tipo somente quando necessário e reserva reconhece cardio', () => {
  const s = setup();
  s.api.addExerciseRow();
  s.render.mockClear();
  s.api.updateExerciseField(0, 'name', 'Supino');
  expect(s.render).not.toHaveBeenCalled();
  s.api.updateExerciseField(0, 'name', 'Corrida');
  expect(s.render).toHaveBeenCalledTimes(1);
  s.api.updateBackupField(0, 0, 'Corrida');
  s.api.toggleExerciseOptional(0);
  expect(s.editor.schedule.SEG.exercises[0]).toMatchObject({
    type: 'cardio', optional: true, backups: [{ name: 'Corrida', type: 'cardio' }, { name: '', type: 'forca' }]
  });
});
test('salvar valida nome, limita dias e preserva data original do plano', () => {
  const s = setup();
  s.fields.editorName = ' ';
  s.api.saveProfileFromEditor();
  expect(s.save).not.toHaveBeenCalled();
  s.fields.editorName = ' Plano ';
  s.api.saveProfileFromEditor();
  expect(s.profiles.p).toMatchObject({ name: 'Plano', daysPerWeek: 7, createdAt: '2025-01-01', updatedAt: '2026-09-28' });
  expect(s.profiles.p.schedule.SEG).toMatchObject({ name: 'A', focus: 'Peito' });
  expect(s.close).toHaveBeenCalledTimes(1);
});
