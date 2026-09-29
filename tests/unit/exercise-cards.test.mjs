import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/exercise-cards.js', import.meta.url), 'utf8'), context);
function setup() {
  const ex = { id: 'a', name: 'Supino', targetSets: 3, targetReps: 10, targetWeight: 20 };
  const state = { data: { a: { name: 'Supino', type: 'forca', weight: 20, obs: '' } } };
  const collapsed = new Set(), previous = { replaceWith: vi.fn() };
  const container = { appendChild: vi.fn(), querySelector: vi.fn(() => previous) };
  const api = context.window.TREINO_EXERCISE_CARDS.create({
    document: { createElement: () => ({ dataset: {}, style: {} }) },
    exercisesContainer: container, getFormData: () => state.data, getCollapsedIds: () => collapsed,
    getHintsOpen: () => new Set(), getNotesOpen: () => new Set(), getHintsSeen: () => ({}),
    getActiveWorkoutKey: () => 'SEG', getActiveProfile: () => ({ schedule: { SEG: { exercises: [ex] } } }),
    getHistoryKey: id => id, getRestSecondsFor: () => 90, renderSeriesRow: () => 'SERIES',
    getCardioHistoryBadge: () => 'CARDIO', getPersistentLoadBadge: () => 'FORCA',
    escapeHtml: value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;'),
    escapeJs: value => String(value ?? '')
  });
  return { api, ex, state, collapsed, container, previous };
}
test('renderiza força/cardio usando estado atual e animação apenas quando solicitada', () => {
  const s = setup();
  const card = s.api.buildExerciseCard(s.ex, 2, true);
  expect(card.style.animationDelay).toBe('120ms');
  expect(card.innerHTML).toContain('Carga para todas as séries');
  expect(card.innerHTML).toContain('FORCA');
  s.state.data = { a: { name: 'Corrida', type: 'cardio', duration: 20, distance: 3, swapping: true } };
  const cardio = s.api.buildExerciseCard(s.ex, 0, false);
  expect(cardio.innerHTML).toContain('Tempo (min)');
  expect(cardio.innerHTML).toContain('CARDIO');
  expect(cardio.className).toContain('swap-flash');
  expect(cardio.className).not.toContain('card-enter');
  expect(s.state.data.a.swapping).toBe(false);
});
test('cartão recolhido omite controles e nome é escapado', () => {
  const s = setup();
  s.collapsed.add('a');
  s.state.data.a.name = '<b>Supino</b>';
  const card = s.api.buildExerciseCard(s.ex, 0, false);
  expect(card.innerHTML).toContain('&lt;b>Supino&lt;/b>');
  expect(card.innerHTML).not.toContain('Carga para todas as séries');
  expect(card.innerHTML).toContain('title="Expandir"');
});
test('atualização pontual substitui somente o cartão; ausente usa renderização completa', () => {
  const s = setup();
  s.api.renderExerciseCard('a');
  expect(s.previous.replaceWith).toHaveBeenCalledTimes(1);
  expect(s.container.appendChild).not.toHaveBeenCalled();
  s.container.querySelector.mockReturnValue(null);
  s.api.renderExerciseCard('a');
  expect(s.container.appendChild).toHaveBeenCalledTimes(1);
});
