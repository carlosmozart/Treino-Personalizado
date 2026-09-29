import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/workout-history-list.js', import.meta.url), 'utf8'), context);

function setup() {
  let limit = 1, history = [];
  const nodes = new Map();
  const getNode = id => {
    if (!nodes.has(id)) nodes.set(id, { classList: { add: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false) } });
    return nodes.get(id);
  };
  const buildWorkoutHistory = vi.fn(() => history);
  const renderWorkoutCalendar = vi.fn();
  const api = context.window.TREINO_WORKOUT_HISTORY_LIST.create({
    document: { getElementById: getNode }, getLimit: () => limit, setLimit: value => { limit = value; },
    getHistory: () => history, setHistory: value => { history = value; }, buildWorkoutHistory,
    renderWorkoutCalendar, escapeHtml: value => String(value).replaceAll('<', '&lt;'),
    capitalizar: value => value, formatDateWithWeekday: date => 'segunda, ' + date,
    formatDuration: value => value + 'min'
  });
  return { api, nodes, buildWorkoutHistory, renderWorkoutCalendar, setHistory: value => { history = value; }, get limit() { return limit; } };
}

test('histórico vazio apresenta orientação e esconde paginação', () => {
  const s = setup();
  s.api.renderWorkoutHistory();
  expect(s.nodes.get('workoutHistoryList').innerHTML).toContain('Nenhum treino registrado');
  expect(s.nodes.get('workoutHistoryMore').classList.add).toHaveBeenCalledWith('hidden');
  expect(s.nodes.get('workoutHistoryCount').textContent).toBe(0);
  expect(s.renderWorkoutCalendar).toHaveBeenCalledTimes(1);
});

test('lista usa limite, mostra volume/cardio e expande sem reconstruir dados antigos', () => {
  const s = setup();
  s.setHistory([
    { date: '2026-09-28', workoutName: '<Peito>', exercicios: [{ type: 'forca' }], volume: 1200, minutos: 50 },
    { date: '2026-09-27', workoutName: 'Cardio', exercicios: [{ type: 'cardio' }], volume: 0 }
  ]);
  s.api.renderWorkoutHistory();
  expect(s.nodes.get('workoutHistoryList').innerHTML).toContain('&lt;Peito>');
  expect(s.nodes.get('workoutHistoryList').innerHTML).toContain('1.200kg');
  expect(s.nodes.get('workoutHistoryMore').textContent).toContain('1 restantes');
  s.api.showMoreWorkoutHistory();
  expect(s.limit).toBe(16);
  expect(s.nodes.get('workoutHistoryList').innerHTML).toContain('cardio');
  expect(s.nodes.get('workoutHistoryMore').classList.toggle).toHaveBeenLastCalledWith('hidden', true);
  expect(s.buildWorkoutHistory).toHaveBeenCalledTimes(2);
});
