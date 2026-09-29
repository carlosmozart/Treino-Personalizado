import { expect, test, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const context = vm.createContext({ window: {} });
vm.runInContext(await readFile(new URL('../../js/ui/weekly-checkins.js', import.meta.url), 'utf8'), context);

function setup() {
  const state = { checkins: {}, sessions: {}, game: { longestStreak: 0, freeMealRewards: {} },
    streak: 0, count: 0, full: false, active: 'seg' };
  const nodes = new Map();
  const element = () => ({ style: {}, children: [], classList: { add: vi.fn(), remove: vi.fn() },
    set innerHTML(value) { this.html = value; this.children = []; },
    appendChild(value) { this.children.push(value); } });
  const document = {
    createElement: element,
    getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); }
  };
  const checkinGrid = element(), streakLabel = element(), monthlyLabel = element();
  const saveJSON = vi.fn(), grantCheckinXP = vi.fn(), revokeCheckinXP = vi.fn(), openWorkoutDay = vi.fn();
  const ui = context.window.TREINO_WEEKLY_CHECKINS.create({
    document, checkinGrid, streakLabel, monthlyLabel,
    DAY_LABELS: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'],
    getMondayOfCurrentWeek: () => new Date(2026, 8, 28), todayKey: () => '2026-09-30',
    formatLocalDateKey: d => [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-'),
    getSessionLog: () => state.sessions, getCheckins: () => state.checkins,
    getGamification: () => state.game, getActiveWorkoutKey: () => state.active,
    openWorkoutDay, calculateStreak: () => state.streak, calculateMonthlyCount: () => 1,
    saveJSON, GAMIFICATION_KEY: 'game', CHECKIN_KEY: 'checkins', checkAchievements: vi.fn(),
    getActiveProfile: () => ({ daysPerWeek: 6 }), calculateWeeklyCheckinCount: () => state.count,
    getFreeMealThreshold: () => .8, getCurrentWeekKey: () => '2026-09-28',
    revokeCheckinXP, grantCheckinXP, areAllExercisesDoneForActiveWorkout: () => state.full
  });
  return { state, ui, nodes, checkinGrid, streakLabel, monthlyLabel,
    saveJSON, grantCheckinXP, revokeCheckinXP, openWorkoutDay };
}

test('grade contém sete dias; passado registrado abre resumo, demais datas ficam bloqueadas', () => {
  const s = setup();
  s.state.sessions = { exercise: [{ date: '2026-09-28' }] };
  s.ui.renderCheckinGrid();
  expect(s.checkinGrid.children).toHaveLength(7);
  s.checkinGrid.children[0].onclick();
  expect(s.openWorkoutDay).toHaveBeenCalledWith('2026-09-28');
  expect(s.checkinGrid.children[1].disabled).toBe(true);
  expect(s.checkinGrid.children[2].onclick).toBeTypeOf('function');
  for (const button of s.checkinGrid.children.slice(3)) expect(button.disabled).toBe(true);
  expect(s.grantCheckinXP).not.toHaveBeenCalled();
});

test('chamadas diretas não marcam nem desmarcam passado ou futuro', () => {
  const s = setup();
  s.state.checkins['2026-09-28'] = 'seg';
  s.ui.toggleCheckin('2026-09-28');
  s.ui.toggleCheckin('2026-10-01');
  expect(s.state.checkins).toEqual({ '2026-09-28': 'seg' });
  expect(s.saveJSON).not.toHaveBeenCalled();
  expect(s.grantCheckinXP).not.toHaveBeenCalled();
  expect(s.revokeCheckinXP).not.toHaveBeenCalled();
});

test.each([false, true])('check-in de hoje encaminha conclusão %s e revoga ao desmarcar', full => {
  const s = setup();
  s.state.full = full;
  s.state.active = 'qua';
  s.ui.toggleCheckin('2026-09-30');
  expect(s.state.checkins['2026-09-30']).toBe('qua');
  expect(s.grantCheckinXP).toHaveBeenCalledWith('2026-09-30', full);
  s.ui.toggleCheckin('2026-09-30');
  expect(s.state.checkins).toEqual({});
  expect(s.revokeCheckinXP).toHaveBeenCalledWith('2026-09-30');
  expect(s.saveJSON).toHaveBeenCalledWith('checkins', s.state.checkins);
});

test('progresso limita barra e lê recompensa restaurada; recorde de sequência não diminui', () => {
  const s = setup();
  s.state.count = 4;
  s.state.streak = 3;
  s.ui.renderCheckinGrid();
  expect(s.nodes.get('weeklyProgressLabel').textContent).toBe('4/6 dias');
  expect(s.nodes.get('freeMealStatus').textContent).toContain('Faltam 1 dia ');
  expect(s.state.game.longestStreak).toBe(3);
  s.state.game = { longestStreak: 10, freeMealRewards: { '2026-09-28': true } };
  s.state.count = 7;
  s.ui.renderCheckinGrid();
  expect(s.nodes.get('weeklyProgressFill').style.width).toBe('100%');
  expect(s.nodes.get('freeMealStatus').textContent).toContain('liberada');
  expect(s.state.game.longestStreak).toBe(10);
  expect(s.checkinGrid.children).toHaveLength(7);
});
