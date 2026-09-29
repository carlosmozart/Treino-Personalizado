import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/swap-picker.js', import.meta.url), 'utf8'), context);
function setup() {
  let data = { a: { name: 'Supino', type: 'forca', sets: 3, reps: 10, weight: 20, series: [{ done: true }] } };
  const definition = { name: 'Supino', backups: [{ name: 'Flexão' }] };
  const nodes = {};
  const node = id => nodes[id] ||= { value: '', classList: { add: vi.fn(), remove: vi.fn() } };
  const history = vi.fn(() => null), save = vi.fn();
  const api = context.window.TREINO_SWAP_PICKER.create({
    document: { getElementById: node }, getFormData: () => data,
    normalizeExerciseName: s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
    getExerciseDef: () => definition, EXERCISE_LIBRARY: { Peito: ['Supino'], Cardio: ['Esteira'] },
    escapeJs: s => s, escapeHtml: s => s, isCardioExerciseName: s => s === 'Esteira',
    getHistoryKey: (id, variant, custom) => `${id}:${variant}:${custom || ''}`,
    getLastSessionForExercise: history, saveDraftNow: save, renderExerciseCard: vi.fn(), showToast: vi.fn()
  });
  return { api, node, definition, history, save, get data() { return data; }, set data(value) { data = value; } };
}
test('troca avulsa recupera histórico próprio sem modificar plano e limpa séries', () => {
  const s = setup();
  s.api.openSwapPicker('a');
  s.history.mockReturnValue({ type: 'cardio', duration: 35, distance: 4 });
  s.api.applySwapPick('Esteira');
  expect(s.history).toHaveBeenCalledWith('a:0:Esteira', 'Esteira');
  expect(s.data.a).toMatchObject({ customName: 'Esteira', type: 'cardio', duration: 35, distance: 4, series: [] });
  expect(s.definition.name).toBe('Supino');
  expect(s.save).toHaveBeenCalledOnce();
  s.api.applySwapPick('Supino');
  expect(s.save).toHaveBeenCalledOnce();
});
test('reserva e original restauram suas variantes e usam estado corrente', () => {
  const s = setup();
  s.data = { a: { name: 'Esteira', customName: 'Esteira', type: 'cardio' } };
  s.api.openSwapPicker('a');
  s.api.renderSwapPickerList('flexao');
  expect(s.node('swapPickerList').innerHTML).toContain('Flexão');
  expect(s.node('swapPickerList').innerHTML).not.toContain('Esteira');
  s.api.applySwapPick('Flexão');
  expect(s.data.a).toMatchObject({ variantIndex: 1, type: 'forca', sets: 3, reps: 10, weight: 0 });
  expect(s.data.a.customName).toBeUndefined();
  s.api.openSwapPicker('a');
  s.api.applySwapPick('Supino');
  expect(s.data.a.variantIndex).toBe(0);
  expect(s.history).toHaveBeenLastCalledWith('a:0:', 'Supino');
});
test('fechar seletor não modifica exercício nem salva rascunho', () => {
  const s = setup();
  const before = structuredClone(s.data);
  s.api.openSwapPicker('a');
  s.api.closeSwapPicker();
  s.api.applySwapPick('Esteira');
  expect(s.data).toEqual(before);
  expect(s.save).not.toHaveBeenCalled();
});
