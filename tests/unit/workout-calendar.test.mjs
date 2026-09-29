import { test, expect, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/workout-calendar.js', import.meta.url), 'utf8'), context);
function setup() {
  let history = [];
  const nodes = {};
  const node = id => nodes[id] ||= { dataset: {}, classList: { toggle: vi.fn() } };
  const api = context.window.TREINO_WORKOUT_CALENDAR.create({
    document: { getElementById: node }, getHistory: () => history,
    DAY_LABELS: ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'],
    todayKey: () => '2026-09-28', now: () => new Date(2026, 8, 28),
    formatLocalDateKey: d => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-'),
    escapeHtml: s => s.replaceAll('<', '&lt;').replaceAll('"', '&quot;')
  });
  return { api, node, setHistory: value => { history = value; } };
}
test('sem histórico mostra mês atual e bloqueia navegação nas duas direções', () => {
  const s = setup();
  s.api.renderWorkoutCalendar();
  expect(s.node('calMonthLabel').textContent).toBe('Setembro 2026');
  expect(s.node('calSummary').textContent).toContain('Nenhum treino');
  expect(s.node('calPrev').disabled).toBe(true);
  expect(s.node('calNext').disabled).toBe(true);
  s.api.changeCalendarMonth(-1);
  s.api.changeCalendarMonth(1);
  expect(s.node('calMonthLabel').textContent).toBe('Setembro 2026');
});
test('limita meses ao primeiro registro e atual; lê histórico substituído', () => {
  const s = setup();
  s.setHistory([{ date: '2026-08-01', workoutName: 'Treino', volume: 100 }]);
  s.api.changeCalendarMonth(-1);
  expect(s.node('calMonthLabel').textContent).toBe('Agosto 2026');
  s.api.changeCalendarMonth(-1);
  expect(s.node('calMonthLabel').textContent).toBe('Agosto 2026');
  s.api.changeCalendarMonth(1);
  s.api.changeCalendarMonth(1);
  expect(s.node('calMonthLabel').textContent).toBe('Setembro 2026');
  s.setHistory([{ date: '2026-09-28', workoutName: '<Treino>', volume: 1200 },
    { date: '2026-09-27', workoutName: 'Corrida', volume: 0 }]);
  s.api.renderWorkoutCalendar();
  expect(s.node('calSummary').textContent).toContain('2 treinos');
  expect(s.node('calGrid').innerHTML).toContain('openWorkoutDay');
  expect(s.node('calGrid').innerHTML).toContain('cardio');
  expect(s.node('calGrid').innerHTML).toContain('&lt;Treino>');
});
