import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/plan-editor.js', import.meta.url), 'utf8'), context);
function setup() {
  let state;
  const nodes = {};
  const node = id => nodes[id] ||= { value: '', classList: { add: vi.fn(), remove: vi.fn() }, setAttribute: vi.fn() };
  const schedule = () => ({ SEG: { name: 'Segunda', focus: '', exercises: [{ id: 'a' }, { id: 'b' }] },
    TER: { name: 'Terça', focus: '', exercises: [] } });
  const profiles = { p: { name: 'Plano', description: '', daysPerWeek: 2, schedule: schedule() } };
  const api = context.window.TREINO_PLAN_EDITOR.create({
    document: { getElementById: node }, getEditorState: () => state,
    setEditorState: value => { state = value; }, getProfiles: () => profiles,
    buildEmptySchedule: schedule, DAY_ORDER: ['SEG', 'TER'], renderExerciseEditorRows: vi.fn(),
    showToast: vi.fn(), setTimeout: vi.fn()
  });
  return { api, node, profiles, get state() { return state; } };
}
test('edição usa cópia do plano, preserva campos ao trocar dia e fecha sem alterar original', () => {
  const s = setup();
  s.api.openProfileEditor('p');
  s.node('editorDayName').value = 'Peito';
  s.node('editorDayFocus').value = ' Força ';
  s.api.selectEditorDay('TER');
  expect(s.state.schedule.SEG).toMatchObject({ name: 'Peito', focus: 'Força' });
  expect(s.profiles.p.schedule.SEG.name).toBe('Segunda');
  s.api.closeProfileEditor();
  expect(s.state).toBeNull();
});
test('controles respeitam limites, descanso individual e contagem de dias', () => {
  const s = setup();
  s.api.openProfileEditor('p');
  s.api.moveExerciseRow(0, -1);
  expect(s.state.schedule.SEG.exercises[0].id).toBe('a');
  s.api.moveExerciseRow(0, 1);
  expect(s.state.schedule.SEG.exercises[0].id).toBe('b');
  s.api.updateExerciseRest(0, '900');
  expect(s.state.schedule.SEG.exercises[0].restSeconds).toBe(600);
  s.api.updateExerciseRest(0, '1');
  expect(s.state.schedule.SEG.exercises[0].restSeconds).toBe(5);
  s.api.updateExerciseRest(0, '');
  expect(s.state.schedule.SEG.exercises[0].restSeconds).toBeUndefined();
  s.api.toggleEditorDayOptional();
  expect(s.state.schedule.SEG.optional).toBe(true);
  s.api.applyDaysPerWeekFromSchedule();
  expect(s.state.daysPerWeek).toBe(1);
});
